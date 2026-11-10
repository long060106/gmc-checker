# Việc bạn cần tự làm (Claude không làm được vì cần tài khoản hoặc danh tính của bạn)

Làm theo thứ tự. Mỗi bước có nhãn **[build now]** (làm ngay được) hoặc **[sell after DSO check]** (chờ DSO xác nhận rồi mới làm).

## 0. Dời project ra khỏi OneDrive (nên làm, 5 phút) [build now]
OneDrive sẽ đồng bộ hàng chục nghìn file trong `node_modules`, gây chậm và có lúc khóa file làm `npm` báo lỗi.
1. Copy cả thư mục `ad project` sang chỗ khác, ví dụ `C:\dev\ad-project`.
2. Trong thư mục mới, xóa `gmc-app\node_modules` rồi chạy lại `npm install`.
3. Mở Claude Code ở thư mục mới.

## 1. GitHub [build now]
```bash
git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
git push -u origin main
```
- Để repo **private**. Commit đang đứng tên email Gmail của bạn; nếu repo public thì email đó sẽ lộ. Muốn ẩn email: chỉnh trong GitHub → Settings → Emails → "Keep my email private", rồi chạy `git config user.email <id>+<user>@users.noreply.github.com`.
- CI (`.github/workflows/ci.yml`) tự chạy typecheck và test mỗi lần push.

## 2. Shopify Partner + dev store [build now]
1. Đăng ký tại partners.shopify.com (miễn phí), rồi tạo một **development store**.
2. Liên kết app (lệnh này tự điền `client_id` vào `shopify.app.toml`):
   ```bash
   cd gmc-app
   npm run config:link
   ```
3. Chạy app trong dev store. Nếu dev store đang bật mật khẩu, check SITE-04 sẽ báo "password-protected"; đó là đúng, không phải lỗi.
   ```bash
   npm run dev
   ```

## 3. Tên miền + email [build now]
Bạn cần một tên miền (khoảng $10/năm). Không có thì không gửi được email kết quả qua Resend, và chính app của mình cũng sẽ trượt check CON-04.
- Tạo một địa chỉ email trên tên miền đó, ví dụ `support@<domain>`, dùng làm `CONTACT_EMAIL`.
- **Địa chỉ bưu điện cho `MAIL_POSTAL_ADDRESS`:** luật CAN-SPAM bắt email thương mại phải có địa chỉ bưu điện thật. Nên dùng PO Box hoặc hộp thư ảo, đừng dùng địa chỉ nhà.

## 4. Deploy lên Fly.io [build now]
```bash
fly auth signup
cd gmc-app
fly launch --no-deploy --copy-config
fly volumes create gmcdata --size 1 --region iad
fly secrets set SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=... SCOPES= SHOPIFY_APP_URL=https://<app>.fly.dev SHOPKEY_SECRET=<chuỗi ngẫu nhiên 64 ký tự> CONTACT_EMAIL=support@<domain>
fly deploy
fly scale count 1
```
- **Phải đặt `fly scale count 1`.** SQLite chỉ chạy đúng trên đúng một máy. Fly mặc định tạo 2 máy, mỗi máy một volume riêng, nên dữ liệu sẽ bị chia đôi.
- **`SHOPKEY_SECRET` tạo một lần và giữ mãi.** Đổi khóa này thì mọi shopKey cũ không còn khớp. Lệnh tạo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Sau khi deploy, sửa `application_url` và `redirect_urls` trong `shopify.app.toml` thành URL của Fly, rồi chạy `npm run deploy` để đẩy cấu hình lên Shopify.
- Kiểm tra: mở `https://<app>.fly.dev/scan` và scan thử một store.

## 5. Email hỏi kết quả sau 14 ngày [build now]
1. Đăng ký Resend, xác minh tên miền, rồi đặt secrets:
   ```bash
   fly secrets set RESEND_API_KEY=... MAIL_FROM="Tên <support@domain>" MAIL_POSTAL_ADDRESS="..." APP_PUBLIC_URL=https://<app>.fly.dev
   ```
2. Mỗi ngày chạy một lần. Chạy thử trước (dry-run, chỉ in ra, không gửi):
   ```bash
   fly ssh console -C "npm run outcome:send"
   ```
   Thấy đúng rồi mới gửi thật:
   ```bash
   fly ssh console -C "npm run outcome:send -- --send"
   ```

## 6. Bài tập code [build now]
- RET-02: làm theo [research/HUONG-DAN-RET-02.md](research/HUONG-DAN-RET-02.md).
- CON-02: chỗ cần viết có dòng `TODO(Long)` trong `gmc-app/app/engine/checks/contact.ts`.
- Viết xong thì gửi Claude review.

## 7. Test tín hiệu 7 ngày (phải là bạn, vì cần tài khoản forum) [build now]
- Trả lời 3 bài mỗi ngày trên Shopify Community, Merchant Center Help Community và Reddit, theo [research/2026-11-09-steps-4-7.md](research/2026-11-09-steps-4-7.md), Step 6.
- Bản nháp bài hướng dẫn dùng lâu dài nằm ở [docs/forum-post-draft.md](docs/forum-post-draft.md).
- **Đọc luật tự quảng cáo (self-promotion) của từng forum trước khi đăng link.**
- Mỗi tuần ghi 5 cặp public vào [data/public-pairs.csv](data/public-pairs.csv), theo [docs/public-pairs-coding.md](docs/public-pairs-coding.md).

## 8. Nộp lên Shopify App Store [build now: nộp dạng app miễn phí]
- Đọc bản nháp listing ở [docs/listing-draft.md](docs/listing-draft.md) và chọn tên. Kiểm tra tên chưa trùng app nào trên App Store.
- Quay screencast theo [docs/reviewer-instructions.md](docs/reviewer-instructions.md).
- Chạy "AI self-review" trên trang nộp app, rồi nộp.
- **Đừng nộp lại khi đang chờ duyệt:** nộp lại sẽ bị đẩy xuống cuối hàng. Thời gian duyệt năm 2026 có lúc từ 2 tuần đến khoảng 3 tháng.

## 9. Thu tiền [sell after DSO check]
- Gặp DSO của UCF để xác nhận bạn có quyền làm việc trước.
- Sau đó mới thêm `appPurchaseOneTimeCreate` (Reinstatement Pass $39) và cập nhật phần giá trong listing.
- Trước bước này, **không** bật billing, **không** nhận pre-order.
