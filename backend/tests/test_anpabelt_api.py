"""API/endpoint tests for Anpabelt Astro app.
This app uses /actions/* endpoints (not /api/*) and /media/* for uploads.
"""
import io
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "SITE_URL",
    "https://cipher-light.preview.emergentagent.com",
).rstrip("/")

ADMIN_EMAIL = "ann@anpabelt.com"
ADMIN_PASSWORD = "anpabelt2025"


@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/actions/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    assert "admin_session" in s.cookies, f"No admin_session cookie: {s.cookies}"
    return s


# ---------- Public pages ----------
class TestPublicPages:
    @pytest.mark.parametrize("path,marker", [
        ("/", "Anpabelt"),
        ("/about", "About"),
        ("/projects", "Projects"),
        ("/blog", "Blog"),
        ("/contact", "Contact"),
    ])
    def test_page_loads(self, anon, path, marker):
        r = anon.get(f"{BASE_URL}{path}")
        assert r.status_code == 200
        assert marker.lower() in r.text.lower()

    def test_home_content(self, anon):
        r = anon.get(f"{BASE_URL}/")
        assert r.status_code == 200
        # Hero text and sections
        assert "Anpabelt" in r.text
        assert "Featured Projects" in r.text or "Projects" in r.text
        assert "Blog" in r.text

    def test_sitemap(self, anon):
        r = anon.get(f"{BASE_URL}/sitemap.xml")
        assert r.status_code == 200
        assert "<urlset" in r.text or "<sitemap" in r.text
        assert "/blog" in r.text

    def test_robots(self, anon):
        r = anon.get(f"{BASE_URL}/robots.txt")
        assert r.status_code == 200
        assert "Sitemap" in r.text
        assert "/admin" in r.text

    def test_404_nonexistent_slug(self, anon):
        r = anon.get(f"{BASE_URL}/blog/this-slug-does-not-exist-xyz")
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_admin_requires_login(self, anon):
        r = anon.get(f"{BASE_URL}/admin", allow_redirects=False)
        assert r.status_code in (302, 303, 307)
        assert "/admin/login" in r.headers.get("location", "")

    def test_login_wrong_password(self, anon):
        r = anon.post(f"{BASE_URL}/actions/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "wrong-pw"})
        assert r.status_code in (400, 401, 403)

    def test_login_success(self, admin):
        assert "admin_session" in admin.cookies

    def test_posts_requires_auth(self, anon):
        r = anon.post(f"{BASE_URL}/actions/posts",
                      json={"title": "x", "content": "y"})
        assert r.status_code == 401

    def test_upload_requires_auth(self, anon):
        r = anon.post(f"{BASE_URL}/actions/upload")
        assert r.status_code == 401


# ---------- Post CRUD ----------
class TestPostCRUD:
    def test_create_edit_publish_delete(self, admin):
        title = f"TEST_post_{uuid.uuid4().hex[:8]}"
        # CREATE (draft)
        r = admin.post(f"{BASE_URL}/actions/posts",
                       json={"title": title, "content": "# Hello\n\nBody.",
                             "tags": "test,pytest", "status": "draft"})
        assert r.status_code in (200, 201), r.text
        data = r.json()
        post = data.get("post") or data
        pid = post.get("id") or post.get("_id") or data.get("id")
        assert pid, f"No id in create response: {data}"
        slug = post.get("slug")

        # UPDATE title
        new_title = title + "_edited"
        r = admin.put(f"{BASE_URL}/actions/posts/{pid}",
                      json={"title": new_title, "content": "# Hi", "tags": "test"})
        assert r.status_code == 200, r.text

        # PUBLISH
        r = admin.put(f"{BASE_URL}/actions/posts/{pid}",
                      json={"status": "published"})
        assert r.status_code == 200, r.text
        pub = r.json()
        p = pub.get("post") or pub
        slug = p.get("slug", slug)
        assert p.get("status") == "published"

        # Public visibility
        if slug:
            r = requests.get(f"{BASE_URL}/blog/{slug}")
            assert r.status_code == 200

        # UNPUBLISH
        r = admin.put(f"{BASE_URL}/actions/posts/{pid}",
                      json={"status": "draft"})
        assert r.status_code == 200

        # Draft should be 404 publicly
        if slug:
            r = requests.get(f"{BASE_URL}/blog/{slug}")
            assert r.status_code == 404

        # DELETE
        r = admin.delete(f"{BASE_URL}/actions/posts/{pid}")
        assert r.status_code in (200, 204)


# ---------- Contact ----------
class TestContact:
    def test_valid_contact(self, anon):
        r = anon.post(f"{BASE_URL}/actions/contact",
                      json={"name": "Tester", "email": "t@example.com",
                            "message": "Hello there from pytest"})
        assert r.status_code == 200, r.text

    def test_invalid_email(self, anon):
        r = anon.post(f"{BASE_URL}/actions/contact",
                      json={"name": "Tester", "email": "not-an-email",
                            "message": "Hello"})
        assert r.status_code in (400, 422)


# ---------- Upload / Media ----------
PNG_1x1 = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
           b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8"
           b"\xcf\xc0\x00\x00\x00\x03\x00\x01\x5b\xea\x1b\xa2\x00\x00\x00\x00"
           b"IEND\xaeB`\x82")


class TestUpload:
    def test_upload_and_serve(self, admin):
        files = {"file": ("test.png", io.BytesIO(PNG_1x1), "image/png")}
        r = admin.post(f"{BASE_URL}/actions/upload", files=files)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        url = (data.get("asset") or {}).get("url") or data.get("url")
        assert url and "/media/" in url, f"Bad upload resp: {data}"
        r2 = requests.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")
