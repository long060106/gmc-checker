# Google Ads: kiểm tra giá trước, chạy sau

Viết ngày 2026-11-16. Bạn tự tạo tài khoản và tự nhập thẻ; Claude không làm hai việc đó.

## Đọc trước: $50 không đủ cho test như kế hoạch cũ

Số liệu Ubersuggest, Mỹ, đọc ngày 2026-11-16. Đây là **một nguồn duy nhất** (Semrush hết lượt), nên bước 1 bên dưới kiểm lại bằng số của chính Google.

| Từ khóa | Lượt tìm/tháng | CPC ước tính |
|---|---|---|
| google merchant center misrepresentation | 70 | $21.69 |
| google merchant center misrepresentation fix | 40 | $24.54 |
| google merchant center suspended | 30 | $20.72 |
| how to fix google merchant center misrepresentation | 10 | $14.05 |
| merchant center suspended / merchant center misrepresentation | 10 mỗi từ | chưa có |

**Ý nghĩa:**
- Với ~$21 mỗi click, $50 chỉ mua được khoảng **2 click**. Không thể đo 60 scan bằng số tiền đó.
- Cả nhóm từ khóa chỉ khoảng **170 lượt tìm mỗi tháng** ở Mỹ. Ít người tìm, và nhiều agency đang trả giá cao (họ bán dịch vụ $450+).
- **Bài toán tiền:** giả sử cứ 10 click có 1 người mua Pass $39, thì mỗi khách tốn khoảng $210 tiền quảng cáo. Với giá $39, quảng cáo tìm kiếm ở mức giá này **không bao giờ hòa vốn**.

**Test hợp lý duy nhất là một test hỏi giá:** "Có click nào rẻ hơn $3 không?" Đặt giới hạn $3 mỗi click và tổng tối đa $50. Kết quả có hai khả năng:
- **Gần như không có click:** quảng cáo tìm kiếm đóng ở giá này. Bạn mất rất ít tiền, có khi $0.
- **Có từ 15 click trở lên với ≤ $50:** đáng xem kỹ hơn.

Làm theo thứ tự: **bước 0 (bắt buộc) → bước 1 (miễn phí) → chỉ làm bước 2 nếu bước 1 cho phép.**

---

## Bước 0 (bắt buộc, 2 phút): sửa ping giữ server thức

Kiểm tra ngày 2026-11-16 cho thấy hai vấn đề:
- Trang `/scan` mất **42 giây** ở lần tải đầu, vì server free của Render đang ngủ.
- Job trên cron-job.org đang **Inactive**, lần chạy cuối báo `Failed (HTTP error)`.

**Nguyên nhân (2 lỗi):**
1. Job ping `http://…/privacy`. Render trả về redirect 301 sang `https://` ngay ở tầng proxy, nên server không được đánh thức. cron-job.org coi 301 là lỗi, sau nhiều lần lỗi thì tự tắt job.
2. Đổi sang `https://…/privacy` vẫn báo `Failed (output too large)`: trang /privacy (7 KB), hoặc trang "đang khởi động" của Render khi server ngủ, quá lớn so với giới hạn của cron-job.org.

**Đã sửa (2026-11-16, Claude làm theo yêu cầu của bạn):** thêm endpoint `/healthz` chỉ trả về `ok` (2 byte, không đụng database). Job **gmc-checker** giờ ping **`https://gmc-checker-wgme.onrender.com/healthz`** mỗi 10 phút và đã được bật lại.

**Tự kiểm tra:** mở console.cron-job.org → job **gmc-checker** → **History**. Các dòng mới phải là `Successful` / `200 OK`. Nếu job lại chuyển sang **Inactive**, xem dòng lỗi gần nhất.

Mỗi tài khoản Render free có 750 giờ chạy mỗi tháng. Một service thức 24/7 dùng khoảng 720–744 giờ, vẫn đủ.

Chưa sửa bước 0 thì **đừng chạy quảng cáo, đừng đăng link ở forum**. Mỗi click sẽ gặp trang trắng 40 giây.

---

## Bước 1 (miễn phí): lấy giá thật từ Keyword Planner

1. Vào **ads.google.com**, đăng nhập bằng tài khoản Google của bạn.
2. Khi Google mời tạo chiến dịch "thông minh" (Smart campaign), tìm link **"Switch to Expert Mode"**. Sau đó chọn **"Create an account without a campaign"**.
3. Xác nhận quốc gia thanh toán, múi giờ, **tiền tệ USD**. Múi giờ và tiền tệ **không đổi được** sau này.
   Google có thể hỏi thông tin thanh toán. Bạn tự nhập; chưa chạy quảng cáo thì chưa bị trừ tiền.
4. **Tools → Planning → Keyword Planner → "Get search volume and forecasts".** Dán 5 dòng:
   ```
   google merchant center misrepresentation
   google merchant center suspended
   merchant center misrepresentation
   merchant center suspended
   website needs improvement merchant center
   ```
   Location: United States, United Kingdom, Canada, Australia. Language: English.
5. Ghi lại cột **"Top of page bid (low range)"** và **"(high range)"** của từng từ.

**Quyết định:**
- Nếu có ít nhất 2 từ khóa có giá thấp (low range) **≤ $5** → làm bước 2.
- Nếu tất cả đều > $5 → **dừng**. Quảng cáo tìm kiếm không hợp với giá $39. Chuyển sức sang listing App Store (SETUP mục 8) và forum.

Gửi Claude ảnh chụp bảng Keyword Planner để chốt.

---

## Bước 2 (tối đa $50, 7 ngày): chiến dịch có giới hạn giá

Giao diện Google Ads hay đổi chữ. Nếu không thấy đúng tên nút, tìm mục có ý nghĩa tương tự.

1. **Campaigns → + New campaign.**
   - Objective: **"Create a campaign without guidance"** (hoặc "Website traffic").
   - Campaign type: **Search**. Goal: website visits, nhập `https://fixlog.me/scan?ref=gads`.
2. **Networks:** **bỏ tick** "Search partners" và **bỏ tick** "Display Network". Chỉ chạy trên Google Search.
3. **Locations:** United States, United Kingdom, Canada, Australia.
   Mở **Location options** → chọn **"Presence: People in or regularly in your included locations"**.
4. **Languages:** English.
5. **Bidding:** chọn **Maximize clicks**, tick **"Set a maximum cost per click bid limit"** → **$3.00**.
   Google tự cộng điều chỉnh giá theo thiết bị/vị trí lên trên mức giới hạn này, nên **đừng thêm điều chỉnh giá nào**.
6. **Budget:** **$7.00/ngày**. Ở mục ngày (Start and end dates), đặt **ngày kết thúc = 7 ngày sau**.
   Google có thể tiêu tới 2 lần ngân sách trong một ngày, nên **mỗi ngày tự xem tổng chi tiêu**. Đủ $50 thì **Pause**.
7. **Bỏ qua** các mục AI Max, Dynamic Search Ads, broad match, "automatically created assets". Tắt hết nếu Google bật sẵn.
8. **Ad group "gmc"**, từ khóa (gõ đúng dấu ngoặc):
   ```
   [google merchant center misrepresentation]
   [google merchant center suspended]
   [merchant center misrepresentation]
   [merchant center suspended]
   [website needs improvement merchant center]
   "merchant center misrepresentation"
   "merchant center suspended"
   ```
   Dấu `[ ]` là exact match: chỉ hiện khi người ta tìm đúng cụm này. Dấu `" "` là phrase match: cho phép thêm vài chữ quanh cụm.
9. **Quảng cáo (Responsive search ad):**
   - Final URL: `https://fixlog.me/scan?ref=gads`
   - Headlines (≤ 30 ký tự, đã đếm):
     `Merchant Center Suspended?` · `Free Shopify Storefront Check` · `Misrepresentation Check` · `Every Finding Shown, Free` · `Check Before You Request` · `No Sign-Up Needed`
   - Descriptions (≤ 90 ký tự, đã đếm):
     `Check your Shopify store against Merchant Center's published website rules.`
     `Each finding shows the Merchant Center rule it comes from and the Shopify fix.`
     `Independent tool, not affiliated with Google. Every finding shown, free.`
   - Không dùng các chữ: "guaranteed", "get reinstated", "approval", "#1", "official".
   - Có thể bị gắn nhãn "Eligible (limited)" vì dùng tên thương hiệu. Bình thường, không cần làm gì.
10. **Conversion tracking:** bỏ qua (Skip). Mình đo bằng tag `?ref=gads` trong database của app.
11. **Publish.** Lần đầu có thể chờ duyệt vài giờ đến 1 ngày.

### Trong 7 ngày
- Mỗi ngày, ở Google Ads, xem Impressions, Clicks, Avg. CPC, Cost.
- Mở **Insights and reports → Search terms**: xem người ta gõ gì. Từ nào không liên quan thì thêm vào Negative keywords.
- Tối chạy `npm run stats -- --since <ngày bắt đầu>`, xem dòng `gads`.

### Sau 7 ngày, quyết định
| Kết quả | Kết luận |
|---|---|
| < 5 click | Không mua được click rẻ. Dừng quảng cáo tìm kiếm. |
| ≥ 15 click, ≤ $50, và ≥ 5 scan có tag `gads` | Có click rẻ, có người dùng thử. Xem tiếp tỉ lệ "đang bị suspend" và waitlist trong `npm run stats`. |
| Nhiều click nhưng gần như không có scan | Người click không phải khách đúng, hoặc trang tải chậm. Kiểm tra lại bước 0 và báo cáo Search terms. |

Nhớ: $39 không bao giờ hòa vốn ở giá ~$20 mỗi click. Test này chỉ để biết có click rẻ hay không, không phải để tìm cách kiếm tiền bằng quảng cáo.
