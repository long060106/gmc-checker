# Việc bạn cần tự làm (Claude không làm được vì cần tài khoản hoặc danh tính của bạn)

Làm theo thứ tự. Mỗi bước có nhãn **[build now]** (làm ngay được) hoặc ghi rõ khi cần tài khoản, tiền hoặc quyết định của bạn.

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
Tên miền: **`fixlog.me`** (từ 2026-11-23, miễn phí năm đầu qua nc.me; các bước chuyển ở [docs/domain-migration.md](docs/domain-migration.md)). Host cũ `gmc-checker-wgme.onrender.com` vẫn chạy: các trang công khai redirect 301 sang fixlog.me, còn embedded app, webhooks, link trong email và `/healthz` vẫn trả lời trực tiếp. Email hỗ trợ công khai: `support@fixlog.me` (`CONTACT_EMAIL` trên Render, trang privacy, listing; từ 2026-11-23). Namecheap Redirect Email chuyển nó về hộp thư `fixlog.support@proton.me`. Forwarding chỉ nhận thư; muốn trả lời từ `support@fixlog.me` thì phải cấu hình thêm địa chỉ gửi trong Proton. Email liên hệ khi nộp app và API contact email vẫn để thẳng Proton.

**Cách miễn phí (cập nhật 2026-11-16):**
1. **Ngay hôm nay:** tạo một Gmail riêng cho app (đừng dùng Gmail cá nhân, vì nó sẽ hiện công khai). Điền vào `CONTACT_EMAIL` trên Render.
2. **Tên miền miễn phí năm đầu:** dùng GitHub Student Developer Pack (education.github.com/pack, đăng ký bằng email `.edu` của UCF). Pack có các ưu đãi tên miền: Namecheap (`.me`, 1 năm), Name.com (một số đuôi, 1 năm), .TECH (1 năm). Từ năm thứ 2 phải trả giá thường, nên **xem giá gia hạn trước khi chọn**.
3. **Email trên tên miền, miễn phí:** nhận thư bằng tính năng chuyển tiếp email miễn phí của nhà đăng ký (hoặc Cloudflare Email Routing), chuyển về Gmail của app. Gửi thư bằng Resend (gói free), xác minh tên miền trong Resend, rồi trong Gmail thêm "Send mail as" `support@<domain>` qua SMTP `smtp.resend.com`.
4. Tránh các tên miền "miễn phí mãi mãi" kiểu `us.kg`, `eu.org`: hay bị dùng để spam và lừa đảo, nên email khó vào inbox và trông kém tin cậy. Với một app nói về độ tin cậy, đó là điểm trừ lớn.
- Có tên miền rồi thì đổi `CONTACT_EMAIL` sang `support@<domain>`.
- **Địa chỉ bưu điện cho `MAIL_POSTAL_ADDRESS`:** luật CAN-SPAM bắt email thương mại phải có địa chỉ bưu điện thật. Nên dùng PO Box hoặc hộp thư ảo, đừng dùng địa chỉ nhà.

## 4. Deploy miễn phí: Render (server) + Turso (database) [build now]
Render free không có ổ đĩa giữ lại được (mỗi lần khởi động lại là mất file), nên database nằm ở Turso: SQLite trên cloud, free 5 GB. Cả hai không cần thẻ. (Phương án Fly cũ vẫn để trong `gmc-app/fly.toml` và `Dockerfile` nếu sau này muốn trả tiền.)

**4.1 Turso (database)**
1. Đăng ký tại turso.tech bằng GitHub.
2. Trong dashboard: tạo database tên `gmc-checker`, chọn vùng US West (gần server Render ở Oregon).
3. Copy **Database URL** (dạng `libsql://gmc-checker-<tên>.turso.io`) và tạo một **token** (Create Token). Lưu cả hai vào trình quản lý mật khẩu.
   Lấy lại sau này: app.turso.tech → **Databases** → `gmc-checker` → mục **Connect** có ô **Database URL** (nút copy bên cạnh) và nút **Create Token**. Token chỉ hiện một lần. Hoặc copy từ Render → service → **Environment**. ⚠️ **Không bấm "Invalidate All Tokens"**: làm vậy thì server Render mất kết nối database.
4. Bảng sẽ tự được tạo lúc Render khởi động (`npm run render-start` chạy `db:turso-migrate` trước).

**4.2 Render (server)**
1. Đăng ký tại render.com bằng GitHub, cho phép Render đọc repo `gmc-checker`.
2. New → **Blueprint** → chọn repo. Render đọc file `render.yaml` ở gốc repo và hỏi các giá trị bí mật:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: từ 4.1.
   - `SHOPKEY_SECRET`: tạo mới bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Tạo một lần, giữ mãi**: đổi khóa là mọi shopKey cũ không còn khớp.
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`: lấy bằng `npm run env -- show` trong `gmc-app`.
   - `SHOPIFY_APP_URL`: `https://fixlog.me` (trước 2026-11-23 là `https://gmc-checker-wgme.onrender.com`; `gmc-checker.onrender.com` là app của người khác).
   - `CONTACT_EMAIL`: để trống cho tới khi có domain.
3. Bấm Apply, đợi build xong (3–5 phút). Mỗi lần `git push` lên `main` là Render tự deploy lại.
4. Kiểm tra: mở `https://fixlog.me/scan` và scan thử `allbirds.com`.

**4.3 Giữ server không ngủ**
Render free tắt server sau 15 phút không có ai truy cập; lần mở sau phải đợi khoảng 1 phút. Người từ forum bấm link mà phải đợi 1 phút sẽ bỏ đi, làm sai kết quả test 7 ngày. Cách xử lý: đăng ký cron-job.org (free), tạo job gọi `https://gmc-checker-wgme.onrender.com/healthz` mỗi 10 phút (đã làm 2026-11-16; đừng dùng `/privacy`, trang đó quá lớn với cron-job.org). Render free cho 750 giờ/tháng, đủ cho 1 server chạy suốt tháng.

**Hai app Shopify (tách từ 2026-11-16):**
- **Dev:** `shopify.app.toml`, app "Long Nguyen" (client_id `414f8f…`). Đây là cấu hình mặc định; `npm run dev` chỉ dùng app này và đổi URL của nó sang tunnel.
- **Production:** `shopify.app.production.toml`, app **"Fixlog"** (client_id `af9f784b…570cb`), chạy trên Render. Không bao giờ tự đổi URL. Đẩy thay đổi cấu hình bằng `npm run deploy -- --config production --allow-updates`.
- Render dùng app Fixlog: `SHOPIFY_API_KEY` = client ID của Fixlog. `SHOPIFY_API_SECRET` phải là **Client secret của Fixlog**: Dev Dashboard → Apps → Fixlog → **Settings** → Client secret → nút copy → dán vào Render → Environment → **Save, rebuild, and deploy**. Bạn tự dán, Claude không dán secret.
- Hai app "Long Nguyen" (Nov 11, 0 lượt cài) và "gmc-checker-dev" trong Dev Dashboard không dùng tới. Muốn dọn thì tự xóa; Claude không xóa.

## 5. Email hỏi kết quả sau 14 ngày [build now]
1. Đăng ký Resend và xác minh tên miền. Script gửi email chạy **trên máy bạn** nhưng đọc database Turso, nên ghi vào `gmc-app/.env` (không commit file này): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM="Tên <support@domain>"`, `MAIL_POSTAL_ADDRESS="..."`, `APP_PUBLIC_URL=https://fixlog.me`.
   ⚠️ Khi `.env` có `TURSO_DATABASE_URL`, `npm run dev` cũng sẽ dùng database production. Ghi xong, gửi email xong thì xóa hai dòng TURSO khỏi `.env`.
2. Mỗi ngày chạy một lần. Chạy thử trước (dry-run, chỉ in ra, không gửi):
   ```bash
   npm run outcome:send
   ```
   Thấy đúng rồi mới gửi thật:
   ```bash
   npm run outcome:send -- --send
   ```

## 6. Bài tập code [build now]
- RET-02: làm theo [research/HUONG-DAN-RET-02.md](research/HUONG-DAN-RET-02.md).
- CON-02: chỗ cần viết có dòng `TODO(Long)` trong `gmc-app/app/engine/checks/contact.ts`.
- Viết xong thì gửi Claude review.

## 7. Test tín hiệu 7 ngày (phải là bạn, vì cần tài khoản forum) [build now]
- **Đọc trước: [docs/traffic-week1.md](docs/traffic-week1.md).** Luật forum (Shopify Community board thường và Google Help Community cấm link /scan), 3 bản nháp trả lời, bài cho board Ask and Offer, link có gắn tag `?ref=`.
- **Google Ads: [docs/google-ads-test.md](docs/google-ads-test.md).** Ping giữ server thức: cron-job.org gọi `https://gmc-checker-wgme.onrender.com/healthz` mỗi 10 phút.
- Đo mỗi tối: `npm run stats -- --since <ngày bắt đầu>`.
- Trả lời bài trên Shopify Community, Merchant Center Help Community và Reddit, theo [research/2026-11-09-steps-4-7.md](research/2026-11-09-steps-4-7.md), Step 6.
- Bản nháp bài hướng dẫn dùng lâu dài nằm ở [docs/forum-post-draft.md](docs/forum-post-draft.md).
- **Đọc luật tự quảng cáo (self-promotion) của từng forum trước khi đăng link.**
- Mỗi tuần ghi 5 cặp public vào [data/public-pairs.csv](data/public-pairs.csv), theo [docs/public-pairs-coding.md](docs/public-pairs-coding.md).

## 8. Nộp lên Shopify App Store [build now: nộp dạng app miễn phí]
- Đọc bản nháp listing ở [docs/listing-draft.md](docs/listing-draft.md) và chọn tên. Kiểm tra tên chưa trùng app nào trên App Store.
- Quay screencast theo [docs/reviewer-instructions.md](docs/reviewer-instructions.md).
- Chạy "AI self-review" trên trang nộp app, rồi nộp.
- **Đừng nộp lại khi đang chờ duyệt:** nộp lại sẽ bị đẩy xuống cuối hàng. Thời gian duyệt năm 2026 có lúc từ 2 tuần đến khoảng 3 tháng.

## 9. Thu tiền: Reinstatement Pass $39 [đã có code]
Code đã xong: trang "Reinstatement Pass" trong app, mua một lần qua Shopify Billing, mở khóa 60 ngày. Bản miễn phí: 3 lần scan mỗi 30 ngày và snapshot đầu tiên.
1. **Bật Public distribution (bắt buộc, kể cả để test), nhưng chỉ trên app PRODUCTION:** Dev Dashboard (hoặc Partner Dashboard) → app → **Distribution** → chọn **Public distribution / Shopify App Store**. Không có bước này, Shopify báo "Apps without a public distribution cannot use the Billing API". ⚠️ Chọn rồi không đổi được.
   **Đừng chọn trên app dev hiện tại** (tên "Long Nguyen", client_id `414f8f…`). App đó có `automatically_update_urls_on_dev = true`: mỗi lần `npm run dev`, Shopify đổi URL của app sang tunnel trên máy bạn. Nếu nó là app trên App Store thì khách thật sẽ bị hỏng app mỗi khi bạn chạy dev. Shopify khuyên tách app dev và app production ([Manage app config files](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files)). Thứ tự đúng: tạo app production → Claude cấu hình cho nó chạy trên Render → chọn Public distribution trên app production → test mua trên dev store.
2. **Test trên dev store:** mở app → Reinstatement Pass → "Get the pass for $39" → Shopify hiện trang duyệt → Approve. Dev store chỉ tạo giao dịch test, không mất tiền. Quay lại app phải thấy "Your pass is active until …".
3. **Nhận tiền thật:** Partner Dashboard → **Payouts**: tài khoản ngân hàng và form thuế (W-9 hoặc W-8BEN). Đăng ký chương trình 0% revenue share cho $1 triệu đầu tiên.
4. **Tiền thật chỉ về sau khi app được duyệt lên App Store.** Store thật thì tự tạo charge thật; dev store luôn là test. `BILLING_TEST=true` ép mọi charge thành test, nhưng **chỉ khi chạy local** (`npm run dev`). Trên Render (`NODE_ENV=production`) biến này bị bỏ qua, để một charge test không bao giờ mở khóa Pass cho store thật.
5. **Hoàn tiền 7 ngày (bạn phải làm tay, hứa với khách là trong 3 ngày làm việc):** khách bấm "Request a refund" trong trang Pass → pass hết hiệu lực ngay và một dòng `RefundRequest` được lưu (Render logs có dòng `[refund] requested shop=…`). Shopify **không** tự hoàn tiền và **không** báo cho khách, nên:
   - Mỗi ngày làm việc chạy `cd C:\dev\ad-project\gmc-app` rồi `npm run refunds` (cần `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` trong `.env` để đọc DB production; nhớ cảnh báo ở mục 5: dev lúc đó cũng dùng DB production).
   - Với mỗi dòng "NOT YET": Partner Dashboard → **Stores** (hoặc Apps → app → History) → tìm store → charge "Reinstatement Pass" → **Details** → **Issue refund**. Nếu charge chưa thanh toán thì Shopify cho **credit** thay vì refund.
   - Xong thì `npm run refunds -- --mark <id>`. Dòng có `TEST` là mua thử trên dev store: không có tiền để trả, chỉ cần mark.
   - Mỗi store chỉ được hoàn 1 lần (code tự chặn). Hoàn tiền là cho công cụ, không phụ thuộc Google quyết định gì, nên không bao giờ hỏi "Google có duyệt không" trước khi hoàn.
