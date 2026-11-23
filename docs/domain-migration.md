# Chuyển Fixlog sang fixlog.me

**Trạng thái (2026-11-23): đã chuyển xong.** Đã làm các bước: Render (custom domain + `SHOPIFY_APP_URL`), DNS ở Namecheap, Shopify app version `fixlog-3`, Search Console (property Domain `fixlog.me`, sitemap, request indexing `/scan` và guide) và IndexNow.

Còn lại:
- Mục C bên dưới.
- Chuyển domain sang tài khoản Namecheap gắn Gmail. Hiện domain nằm ở tài khoản gắn email UCF; dùng tính năng Push domain của Namecheap.
- Record TXT `google-site-verification` ở `@` phải giữ, xoá đi thì Search Console mất xác minh.

Viết ngày 2026-11-23. Domain: `fixlog.me`, miễn phí năm đầu qua [nc.me](https://nc.me/) (Namecheap for Education). Từ năm thứ hai giá $15/năm và tự gia hạn; có thể tắt auto-renew trong Namecheap.

Code đã chuẩn bị sẵn (`legacyHostRedirect` trong `gmc-app/app/lib/site.server.ts`). Nó **chưa làm gì** khi `SHOPIFY_APP_URL` còn là onrender. Đổi biến đó sang `https://fixlog.me` thì host cũ tự redirect 301 các trang công khai: `/`, `/scan`, `/guides/*`, `/privacy`, `/robots.txt`, `/sitemap.xml`.

Những thứ **vẫn chạy trên host cũ** để không gãy giữa chừng: embedded app (`/?shop=`, `/app`, `/auth`), webhooks, link trong email đã gửi (`/outcome/`, `/unsubscribe/`), `/healthz`, và file xác minh Search Console cũ.

## A. Bạn tự làm (khoảng 5 phút)

1. Ở tab nc.me (giỏ đang có `fixlog.me`, $0.00), bấm **Complete order**.
2. Nhập email `@ucf.edu` và mở link xác nhận trong hộp thư trường (nhớ xem cả spam).
3. Đăng nhập hoặc tạo tài khoản Namecheap, chấp nhận điều khoản và hoàn tất đơn $0.
4. Bỏ qua bước GitHub Pages.

## B. Claude làm sau khi có domain

Bước nào đổi cài đặt trên tài khoản thì Claude hỏi bạn trước khi bấm.

1. **Render** → service `gmc-checker` → Settings → Custom Domains → Add `fixlog.me`. Render tự thêm `www.fixlog.me` và redirect nó về `fixlog.me`.
2. **Namecheap** → Domain List → `fixlog.me` → Advanced DNS:
   - Xoá các record parking mặc định (CNAME `www` → parkingpage, URL Redirect `@`) và mọi record AAAA.
   - Thêm `A` `@` → `216.24.57.1`, TTL 1 min.
   - Thêm `CNAME` `www` → `gmc-checker-wgme.onrender.com`, TTL 1 min.
   - Nguồn: [Render: Namecheap DNS](https://render.com/docs/configure-namecheap-dns).
3. Bấm **Verify** trên Render và đợi chứng chỉ TLS (Render tự cấp). Kiểm tra `https://fixlog.me/scan` trả về 200.
4. **Đổi domain trong vài phút liền nhau**, để khoảng thời gian app OAuth lệch URL ngắn nhất:
   - Render → Environment: `SHOPIFY_APP_URL=https://fixlog.me`, rồi đợi deploy xong.
   - Sửa `gmc-app/shopify.app.production.toml`: `application_url = "https://fixlog.me"` và `redirect_urls = [ "https://fixlog.me/api/auth" ]`. Sau đó chạy `npm run deploy -- --config production`.
5. Kiểm tra trên production:
   - `https://gmc-checker-wgme.onrender.com/scan?ref=x` → 301 sang `https://fixlog.me/scan?ref=x`.
   - `/healthz` trên host cũ → 200.
   - Thẻ canonical và `robots.txt` trên fixlog.me trỏ về fixlog.me.
   - Mở app trong admin của store dev.
6. **Search Console**:
   - Thêm property kiểu **Domain** `fixlog.me`, xác minh bằng record TXT trong Namecheap.
   - Submit `https://fixlog.me/sitemap.xml` và Request indexing `/scan` cùng trang guide.
   - Giữ property cũ; file xác minh vẫn được phục vụ trên host cũ.
   - Ping IndexNow cho 3 URL mới.
7. **cron-job.org**: đổi job ping sang `https://fixlog.me/healthz`. Host cũ vẫn trả 200 nên không gấp.
8. **Sửa link trong docs**:
   - `docs/listing-draft.md` (Privacy policy URL)
   - `docs/submission-guide.md`
   - `docs/reviewer-instructions.md`
   - `docs/traffic-week1.md`
   - `docs/google-ads-test.md`
   - `SETUP.md`
   - `APP_PUBLIC_URL` trong `gmc-app/.env`
9. **Không** tắt "Render Subdomain" trên Render. Webhooks, email đã gửi và ping vẫn dùng host cũ.

## C. Làm sau (không chặn việc nộp app)

- Email `support@fixlog.me`: **đã bật 2026-11-23**, dùng Redirect Email của Namecheap để chuyển về Gmail cá nhân (MX `eforward1-5.registrar-servers.com`, SPF `include:spf.efwd.registrar-servers.com`). Chưa đổi `CONTACT_EMAIL` trên Render và email hỗ trợ trong listing, hai chỗ này vẫn là `fixlog.support@proton.me`. Đổi sang `support@fixlog.me` thì check CON-04 của chính app sẽ hết cảnh báo về email miễn phí. Lưu ý: trả lời thư từ Gmail sẽ lộ địa chỉ Gmail. Xác minh domain trên Resend để gửi email hỏi kết quả (SETUP.md mục 5) vẫn chưa làm.
