# Nộp Fixlog lên Shopify App Store: hướng dẫn từng bước

Viết ngày 2026-11-21, theo tài liệu Shopify đọc cùng ngày ([Submit your app](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review), [App Store requirements 4.5](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements), [Best practices](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices), [Migrate from the Partner Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard/migrate-from-partners)).
Nếu nút hay menu trên màn hình khác với mô tả ở đây, làm theo màn hình rồi báo Claude để sửa file này.

Thứ tự làm: **A → B → C → D → E → F**. Phần A và B mất khoảng 5 phút. Phần C (quay video) mất khoảng 30 phút.

---

## A. Emergency developer contact (bắt buộc, requirement 4.5.6)
1. Mở Dev Dashboard. Ở **góc dưới bên trái**, bấm **Organization settings**.
2. Chọn **Organization**. Tìm mục **Emergency developer contact** (Shopify gom thông tin này cùng contact details).
3. Điền **email** và **số điện thoại**. Shopify chỉ dùng hai thông tin này để báo sự cố kỹ thuật nghiêm trọng của app.
   - Email: dùng `fixlog.support@proton.me` (hòm thư bạn đã kiểm tra) hoặc email cá nhân. Bạn tự chọn.
   - Số điện thoại: số của bạn. Bạn tự nhập.
4. Bấm Save.

## B. Payouts (không chặn việc nộp app, nhưng cần có để nhận tiền $29)
1. **Organization settings → Payouts → Add payout method**.
2. Shopify trả tiền qua Hyperwallet (ngân hàng hoặc PayPal). Nếu Shopify yêu cầu xác minh danh tính thì bấm **Update verification**. Có thể sẽ phải khai thông tin thuế.
3. Bước này toàn là thông tin cá nhân và tài chính, nên chỉ bạn làm. Claude không nhìn và không điền.

---

## C. Quay screencast (bắt buộc, requirement 4.5.3)
Shopify yêu cầu video **bằng tiếng Anh hoặc có phụ đề tiếng Anh**, hướng dẫn từng bước cách cài đặt và dùng các tính năng chính, và cho thấy kết quả của từng bước test.

### C1. Chuẩn bị (không quay)
1. **Tạo một dev store mới** tên `fixlog-demo`: Dev Dashboard → **Stores** → **Create store** (development store).
   Lý do: store `long-gmc-test` đã hết 3 lượt quét miễn phí và đã dùng snapshot miễn phí. Store mới cho video đi đúng luồng miễn phí → paywall → Pass.
2. Trên `fixlog-demo`: **Settings → General → Store contact email** → đổi thành `fixlog.support@proton.me`. Nếu Shopify gửi mã xác minh thì bạn tự nhập.
   Lý do: email mặc định của store là Gmail cá nhân của bạn, và finding "Support email" sẽ hiện email này lên video.
3. **Chưa cài Fixlog, chưa quét lần nào.** Luồng video dùng đúng 3 lượt quét miễn phí cộng 1 snapshot. Quét thử trước là hết lượt.
   Nếu lỡ hết lượt giữa chừng: mua Pass (test charge, không mất tiền) rồi quay tiếp.
4. Chrome: bật cửa sổ toàn màn hình, zoom 100%, tắt bookmarks bar (`Ctrl+Shift+B`), đóng các tab khác.
   Mở sẵn 2 tab:
   - Tab 1: Dev Dashboard → Apps → **Fixlog** (để bấm Install app).
   - Tab 2: admin `fixlog-demo` → **Online Store → Preferences** (để copy storefront password).
5. Công cụ quay: nên dùng **Loom** (extension Chrome, có nút pause, quay xong có link ngay; bản free đủ cho video khoảng 4 phút). Đăng ký Loom bằng `fixlog.support@proton.me`, đặt tên hiển thị là "Fixlog", để video không lộ tên và Gmail cá nhân.
   Cách khác: **Snipping Tool** của Windows (`Win+Shift+R`), rồi upload lên YouTube ở chế độ **Unlisted**.
6. Bật micro và đọc lời thoại tiếng Anh bên dưới. Không cần đọc trôi chảy, chỉ cần rõ ràng.

### C2. Kịch bản quay (khoảng 3–4 phút)
Lời thoại tiếng Anh nằm trong dấu ngoặc kép. Đoạn nào cần gõ lâu (điền form, tạo trang) thì bấm **pause** trên Loom.

| # | Bấm gì | Nói gì |
|---|---|---|
| 1 | Tab 1: **Install app** → chọn `fixlog-demo` → màn hình xin quyền của Shopify → **Install**. App mở ra trang "Storefront check". | "This is Fixlog. It checks a Shopify storefront against Google's published Merchant Center rules. I'm installing it on a development store. It asks for no access scopes, so there's nothing to grant." |
| 2 | Bấm **Scan my store**. Banner **"Your store is password-protected"** hiện ra. | "Development stores are password-protected, so Google can't see them, and the app says so." |
| 3 | Tab 2: copy password → quay lại app → dán vào ô **Storefront password** → **Save and scan**. | "To see the full report, I paste the storefront password from Online Store, Preferences, and click Save and scan. The app only uses it to open the store for scans. It can be removed any time and is deleted on uninstall." |
| 4 | Báo cáo đầy đủ hiện ra. Mở 1 finding (ví dụ About page hoặc Contact page), chỉ vào evidence, **Where to fix** và link **Google's rule**. **Không mở** finding "Support email". | "Each finding shows what the app saw, where to fix it in the Shopify admin, and the Google help page the rule comes from." |
| 5 | **Merchant Center info** → điền 4 trường bằng dữ liệu giả (vd. Fixlog Demo, +1 555 010 0199, support@example.com, 100 Test Street, Orlando, FL 32801) → Save → **Scan again**. | "Next I enter the business details exactly as they are in Merchant Center. The Identity and Contact checks now compare them with the storefront." |
| 6 | (Pause) Mở tab admin → **Online Store → Pages → Add page**, tiêu đề **About us**, gõ một câu → Save. (Resume) | "Now I fix one issue in the store: I add an About page." |
| 7 | Quay lại app → **Before you request a review** → chọn một issue label → **I'm about to request a review**. Danh sách **"Changes made since …"** có dòng "About page exists". | "Right before asking Google for a review, the merchant takes a snapshot. The app scans again and lists which checks changed since the first full scan." |
| 8 | Bấm **Open your review kit** → **Copy**, rồi **Download .txt**. | "The review kit has what changed, what is still flagged, and earlier requests. The merchant can copy it or download it as a text file." |
| 9 | Về app home: dòng "0 of 3 free scans left" hiện ra. Mở **Review Pass** → **Get the pass** → trang **Approve charge** của Shopify ("You will not be billed for this test charge") → **Approve** (bạn tự bấm). | "The free plan includes every finding, three scans every thirty days, and the first snapshot. The Review Pass is a one-time charge through Shopify Billing. On a development store it's a test charge." |
| 10 | Trang hiện **"Your pass is active until …"** → về app home → **Scan my store** chạy được. | "With the pass, scans and snapshots are unlimited for sixty days. A refund can be requested on this page within seven days." |
| 11 | Admin → **Settings → Apps** → Fixlog → **Uninstall**. | "Uninstalling deletes the saved storefront password, and Shopify's shop redact webhook deletes the rest of the shop's data. Thanks for reviewing." |

Không nói những câu sau trong video (đây là danh sách "Never write" của dự án): "get reinstated", "fix your suspension", "approval chance", "readiness score", "guaranteed", "Google-approved", "official".

### C3. Lấy link video
- Loom: bấm **Share** → để quyền **Anyone with the link can view** → **Copy link**.
- YouTube: Visibility = **Unlisted** → copy link.
- Mở link trong cửa sổ ẩn danh để chắc người khác xem được.

---

## D. Điền listing (trang App Store review của app Fixlog)
Mở: Dev Dashboard → Apps → **Fixlog** → trang **App Store review / Distribution**. Partner Dashboard vẫn quản lý phần distribution. Trang này lưu tự động.

**Ngôn ngữ chính:** English. Tạo 1 listing.

| Trường | Dán vào |
|---|---|
| App name | `Fixlog – GMC Review Prep` |
| App icon | `docs/listing/icon-1200.png` (đã upload) |
| App card subtitle | `Know what to fix and what changed before you request a review` (61 ký tự). Phương án dự phòng: `Check your store against Google rules before a GMC review` (57). Nếu form giới hạn ngắn hơn, báo Claude. |
| App introduction | lấy từ `docs/listing-draft.md` → "App introduction" |
| App details | `docs/listing-draft.md` → "App details" |
| Feature list | `docs/listing-draft.md` → 6 dòng "Feature list" |
| Feature media | ảnh `docs/listing/feature-image.png` (1600×900). Alt text: `Fixlog snapshot of the changes made before a Merchant Center review request` |
| Screenshots | 5 file trong `docs/listing/screenshots/`, theo thứ tự 1→5, với alt text bên dưới |
| Demo store URL | bỏ trống (store dev có password) |
| Search terms | `merchant center suspended`, `misrepresentation`, `website needs improvement`, `google shopping policy`, `gmc compliance` |
| Pricing | 2 gói: **Free** (every finding of every scan, 3 scans per 30 days, first pre-review snapshot and review kit, review history) và **Review Pass**, one-time **$29** (60 days of unlimited scans, a snapshot and review kit for every review request). Không ghi giá ở bất kỳ chỗ nào khác. |
| Category / tags | chọn category gần nhất với Google Shopping / Merchant Center. Form có định nghĩa từng category; chọn theo chức năng chính là kiểm tra storefront. |
| Install requirements | yêu cầu sales channel **Online Store** (app đọc storefront công khai). Không giới hạn quốc gia. |
| Privacy policy URL | `https://fixlog.me/privacy` |
| Support / contact email | `support@fixlog.me` (chuyển tiếp về hộp thư `fixlog.support@proton.me`) |
| App submission contact email | `fixlog.support@proton.me`. Shopify gửi mọi email về đợt review vào địa chỉ này; để thẳng hộp thư Proton cho chắc, không qua forwarding. |

**Alt text cho 5 screenshot:**
1. `Storefront check results for site and identity, each marked Check or Pass`
2. `Policy findings with the evidence found, where to fix it in Shopify, and Google's rule`
3. `Form for the business name, phone, email and address used in Merchant Center`
4. `Pre-review snapshot listing the changes made since the first scan`
5. `Review request kit with buttons to copy it or download it as a text file`

**Proton:** để không lỡ email review, vào Proton → **Settings → Filters → Spam, block, and allow lists** → thêm `noreply@shopify.com` vào **Allow list**.

## E. Testing information (phần cho reviewer)
- **Testing instructions:** copy nguyên phần "Test instructions for Shopify's reviewer" (các bước 1–7) trong `docs/reviewer-instructions.md`.
- **Test credentials:** ghi `No login needed. The app has no separate account; it opens inside the Shopify admin after install.`
- **Screencast URL:** link lấy ở bước C3.

## F. Kiểm tra rồi Submit
1. Trên trang review, chạy **automated checks**. Bước nào fail thì chụp màn hình gửi Claude.
2. Listing tiếng Anh được AI của Shopify kiểm tự động: subtitle, review/testimonial, giá ngoài phần pricing, số liệu, link, tên app quá chung chung. Nếu bị flag thì gửi Claude để sửa. Flag không chặn việc submit, nhưng sửa trước sẽ đỡ bị chậm.
3. Self-review ở mức code (không bắt buộc): chạy lệnh dưới đây trong terminal, khởi động lại Claude Code, rồi bảo Claude: "Review my app against the Shopify App Store requirements".
   ```powershell
   claude plugin install shopify-ai-toolkit@claude-plugins-official
   ```
   Claude cũng có thể chạy `shopify app security check` (công cụ quét bảo mật của Shopify CLI, chạy trên máy).
4. Bấm **Submit your app**. App chuyển sang trạng thái **Submitted** và Shopify gửi email xác nhận về hòm thư Proton.
   Các trạng thái tiếp theo:
   - **Paused**: thiếu yêu cầu cơ bản, cần sửa rồi bấm **Submit fixes**.
   - **Reviewed**: cần trả lời email của reviewer.
   - **Published**: đã lên App Store.
5. Bạn tự bấm mọi checkbox điều khoản (terms) trên trang nộp.
