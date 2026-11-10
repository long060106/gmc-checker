# Cách ghi cặp "sửa gì → kết quả" từ bài đăng công khai

Mục đích: biết merchant hay sửa gì để chọn check nào làm trước, và có ví dụ thật (kèm link) để hiển thị. **Các cặp này không bao giờ được trộn vào số liệu xếp hạng**, vì người ta chủ yếu đăng chuyện thành công nên dữ liệu bị lệch (survivorship bias).

## Tìm bài ở đâu (khoảng 2 giờ mỗi tuần, mục tiêu 5 cặp mỗi tuần)
- support.google.com/merchants/community: tìm "reinstated", "suspension lifted", "approved after".
- community.shopify.com: tìm "merchant center reinstated", "misrepresentation fixed".
- Reddit r/PPC, r/googleads, r/shopify: dùng cùng các từ khóa trên.

## Ghi vào `data/public-pairs.csv`, mỗi bài một dòng
| Cột | Ghi gì |
|---|---|
| date_found | Ngày bạn đọc bài (YYYY-MM-DD) |
| source | `google_community`, `shopify_community` hoặc `reddit` |
| source_url | Link tới bài |
| post_date | Ngày bài được đăng |
| label | Một trong 8 nhãn: misrepresentation, website_needs_improvement, insufficient_contact_info, missing_return_policy, site_inaccessible, login_required, cannot_complete_purchase, other |
| attempt_no | Lần xin review thứ mấy, nếu bài có nói; không nói thì để trống |
| fixes_check_ids | Các check ID khớp với việc họ đã sửa, cách nhau bằng `;`. Ví dụ: `CON-01;RET-02;ID-01` |
| fixes_other | Những việc đã sửa không khớp check nào. **Viết bằng lời của bạn, ngắn gọn** |
| outcome | `reinstated`, `rejected` hoặc `unknown` |
| confidence | `high` nếu họ nói rõ cả việc đã sửa lẫn kết quả; `medium` nếu một trong hai còn mơ hồ; `low` nếu phải đoán |
| notes | Ghi chú ngắn |

## Luật bắt buộc
- **Không ghi username**, không ghi tên store và không copy nguyên câu từ bài. Chỉ ghi lại thông tin đã rút ra, bằng lời của bạn.
- **Bỏ qua bài** không nói rõ kết quả, hoặc chỉ là "mình cũng bị".
- Nếu một việc họ sửa xuất hiện nhiều lần mà chưa có check nào, ghi vào `fixes_other`. Đó là gợi ý cho check mới.

## Đối chiếu nhanh việc đã sửa với check ID
| Họ viết | Check |
|---|---|
| "added contact page", "added phone/address" | CON-01, CON-02 |
| "matched address/phone with Merchant Center" | CON-03 |
| "changed business name", "same name everywhere" | ID-01 |
| "rewrote return/refund policy" | RET-01, RET-02 |
| "added shipping policy", "shipping times" | SHP-01 |
| "removed placeholder / lorem ipsum" | SITE-01, POL-02 |
| "fixed broken links" | SITE-02 |
| "removed password" | SITE-04 |
| "fixed price mismatch / structured data" | PRC-01, PRC-02 |
| "removed health claims" | CLM-01 |
| "removed fake badges / trust seals" | TRU-01 |
| "verified business / ID verification" | không có check (ghi vào `fixes_other`) |
