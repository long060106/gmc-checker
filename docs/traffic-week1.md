# Traffic tuần 1 (Step 6): luật forum, bản nháp trả lời, cách đo

Viết ngày 2026-11-16. Luật forum có thể đổi: đọc lại link nguồn trước khi đăng.

## 0. Tóm tắt: kế hoạch cũ cần sửa

Kế hoạch Step 6 giả định: trả lời forum kèm link `/scan`, rồi đếm số scan. Đọc luật thật thì **2 trong 3 kênh cấm link đó**:

| Kênh | Được gắn link /scan? | Nguồn |
|---|---|---|
| Shopify Community, các board thường | **Không.** Cấm giới thiệu app (kể cả app của mình) và cấm link quảng bá ra site ngoài trong câu trả lời. Vi phạm thì bị chuyển chỗ hoặc xóa, có thể bị khóa tài khoản. | [Community FAQ](https://community.shopify.com/faq) |
| Shopify Community, board **Ask and Offer** | **Được**, nếu: giải thích app giúp gì cho đúng nhu cầu, nói rõ là app của mình, nói rõ giá. Không để email/WhatsApp, không "liên hệ tôi". | [Community FAQ](https://community.shopify.com/faq) |
| Google Merchant Center Help Community | **Không.** Cấm "content or URLs that are promotional or commercial in nature". | [Google Help Community policy](https://support.google.com/communities/answer/7425194) |
| Reddit (r/PPC, r/shopify, r/googleads, r/ecommerce) | **Chưa rõ.** Mình không đọc được Reddit (bị chặn). Bạn đọc sidebar + Rules của từng sub trước khi đăng. Quy ước chung: tối đa ~10% bài có link của mình, phải nói rõ là của mình. | Sidebar từng sub |

**Thêm một phát hiện (đọc thread ngày 2026-11-16):** các thread GMC trên Shopify Community đang **đầy người bán dịch vụ**. Một thread (698844) có ~22 trả lời, trong đó có audit $99 hoàn tiền, dịch vụ $450 trả khi được mở khóa, "Trust Score" miễn phí, dịch vụ FHAVI, và 4 bài bị cộng đồng gắn cờ ẩn. Hôm nay có thêm một người tự giới thiệu app Shopify tên "Unflag" (free scan). Chủ thread còn khen câu trả lời "của người thật" hơn câu trả lời viết bằng AI.

**Hệ quả:**
1. Trả lời trên các board thường **không đo được bằng số scan** (không có link). Nó chỉ xây uy tín và để lại câu trả lời cho người tìm Google sau này. Vẫn đáng làm, nhưng ít, và phải thật sự có ích.
2. Ngưỡng hủy "< 30 scan sau ≥ 20 câu trả lời" **không còn ý nghĩa** với kênh không được gắn link. Chỉ tính các kênh có link: Ask and Offer, Reddit (nếu sub cho phép), Google Ads.
3. Kênh đo được rõ nhất là **listing trên App Store** (SETUP mục 8) và board **Ask and Offer**. Google Ads quá đắt cho giá $39 (mục 4).

## 1. Link có gắn tag: luôn dùng link này, không dùng link trần

Mỗi kênh một tag, để `npm run stats` tách được kênh nào ra scan:

| Kênh | Link |
|---|---|
| Shopify Community, Ask and Offer | `https://gmc-checker-wgme.onrender.com/scan?ref=sc-askoffer` |
| Reddit r/PPC | `...?ref=reddit-ppc` |
| Reddit r/shopify | `...?ref=reddit-shopify` |
| Reddit r/googleads | `...?ref=reddit-googleads` |
| Google Ads | `...?ref=gads` |
| Profile forum (ô website) | `...?ref=profile` |

Tag chỉ nhận chữ thường, số, dấu gạch ngang, tối đa 40 ký tự; sai định dạng thì bị bỏ.

**Đo:** mỗi tối chạy (cần 2 dòng TURSO trong `.env`, xem SETUP mục 5):
```
npm run stats -- --since 2026-11-17
```
Script in số scan theo từng tag, tỉ lệ người nói "đang bị suspend", số đăng ký waitlist, và đánh dấu ngưỡng nào đạt.

## 2. Ba bản nháp trả lời (board thường: KHÔNG link /scan, KHÔNG nhắc app)

⚠️ **Viết lại bằng giọng của bạn trước khi đăng.** Cộng đồng đang gắn cờ các câu trả lời nghe như AI. Chỉ giữ ý và link của Google. Mỗi bản nháp chỉ thêm điều **chưa ai nói** trong thread.

### 2a. Thread 698844: "Third Merchant Center suspended for Misrepresentation"
Link: https://community.shopify.com/t/698844 . Chủ thread: shop đồ chơi gỗ ở Đức, đây là **tài khoản Merchant Center thứ 3** sau 2 lần bị suspend.

Điều chưa ai nói rõ: Google coi việc mở tài khoản mới sau khi bị suspend là vi phạm riêng, rất nặng. **Mở link Google bên dưới và kiểm tra đúng câu chữ trước khi đăng.**

> One thing nobody has mentioned yet, and it matters more than any page fix: Google's "Abuse of the network" policy lists, under *Circumventing systems*, creating new accounts to get back in after a previous suspension. It's treated as egregious (suspension without warning), separate from Misrepresentation. https://support.google.com/merchants/answer/6150118
>
> So for this third account, I'd do two things before any review request:
> 1. In the appeal, say plainly that the earlier accounts exist and were suspended, and that this is the same business. Hiding it is the worst case if Google links them.
> 2. Write down, with dates, every change you've made since the last rejection (the Impressum phone fix, the structured data, the safety wording). Google's review page says a review takes about 7 business days and can take up to 2 weeks, and after a second unsuccessful one a cool-down can start and grow each time: https://support.google.com/merchants/answer/13585221 . So one complete request beats several partial ones.
>
> Only Google can say whether the account comes back, but at least the request won't be missing the obvious.

### 2b. Thread 707122: "Online store themes" (shop dựng bằng Sidekick AI, đã 3 lần xin review, bị suspend hẳn)
Link: https://community.shopify.com/t/707122

Điều chưa ai nói: text AI tạo ra thường có **chỗ trống mẫu** và **cam kết không kiểm chứng được** nằm rải ở nhiều nơi, không chỉ trang About.

> Agree a new theme won't change anything. Google reads the text, not the design. Since the store was built with an AI helper, I'd search the whole store for generated text Google can't verify. It hides in more places than the About page:
> - **Settings → Policies:** look for brackets or leftovers like "[store name]", "X days", an email that isn't yours. Google's editorial page asks for return timeframes, return methods, shipping fees and refund processing to be stated: https://support.google.com/merchants/answer/17233876
> - **Product descriptions:** claims like "certified", "eco-friendly", "#1", "free shipping worldwide" that you can't back up.
> - **Footer and announcement bar:** fake urgency ("only 2 left", countdowns) and trust badges you didn't earn.
> - **Settings → Store details:** the business name has to match Merchant Center exactly.
>
> After 3 rejections, check whether Merchant Center still shows a review button before spending more on fixes.

### 2c. Thread 657684: "Misrepresentation on Google Merchant Center" (đã thêm đủ trang policy, còn 1 lần appeal)
Link: https://community.shopify.com/t/657684

Điều chưa ai nói: **có trang** khác với **trang có đủ nội dung Google liệt kê**.

> Having the pages isn't the same as having what Google lists *on* them. Google's editorial requirements are specific, so it's worth reading your pages against the list, line by line: https://support.google.com/merchants/answer/17233876
> - **Contact:** "clear, accessible contact details". In practice that means the phone, email and address written as text on the site (not only a form), the same as in Merchant Center → Business info.
> - **Returns:** the timeframe, how to return, who pays return shipping, and when and how the refund is issued. A policy that says "contact us for returns" misses three of the four.
>
> With one appeal left, I'd also keep a dated list of exactly what you changed. If it's rejected again, you'll know what was already tried.

## 3. Bài trên board Ask and Offer (được gắn link, phải tự nhận là của mình)

Đăng **một lần**, rồi chỉ trả lời người hỏi. Board: Shopify Community → Ask and Offer (đọc mô tả board trước khi đăng).

> **Title:** Free storefront check for Merchant Center "Misrepresentation" / "Website needs improvement" (I built it)
>
> Disclosure: I built this tool. It's free, with no sign-up.
>
> It reads your public store the way Google's crawler does (server HTML, no JavaScript) and checks it against Google's published Merchant Center website requirements. That covers contact details, business-name consistency, return/refund/shipping policy content, placeholder text, broken links, prices in structured data vs. the page, and claims Google calls unreliable. Every finding shows what it saw, the Google help page the rule comes from, and where to fix it in Shopify. Nothing is hidden behind a paywall.
>
> https://gmc-checker-wgme.onrender.com/scan?ref=sc-askoffer
>
> What it can't do: see your Merchant Center account, product feed or verification status, or tell you whether you'll be reinstated. Only Google decides that. A clean report means the public criteria it checks look fine, nothing more.
>
> Cost: the web check is free. A Shopify app version is coming with a paid one-time pass ($39) for tracking fixes across review requests; the free check stays free.
>
> If it flags something that's wrong for your store, reply here and I'll fix the check.

## 4. Google Ads: xem [docs/google-ads-test.md](google-ads-test.md)

Cập nhật 2026-11-16: các từ khóa này giá khoảng **$20–25 mỗi click** (Ubersuggest, Mỹ), tổng chỉ khoảng 170 lượt tìm mỗi tháng. $50 chỉ mua được khoảng 2 click, nên **không đo được ngưỡng Step 6 bằng quảng cáo**. File kia có:
- Bước 0 (bắt buộc): sửa ping giữ server thức.
- Bước 1 (miễn phí): lấy giá thật trong Keyword Planner.
- Bước 2: chiến dịch giới hạn $3 mỗi click, tổng tối đa $50, chỉ chạy nếu bước 1 cho phép.

## 5. Mỗi ngày (khoảng 30 phút)

1. Tìm thread mới: mở https://community.shopify.com/search?q=merchant%20center%20suspended%20order%3Alatest , chọn 1–2 thread **chưa có câu trả lời tốt**.
2. Trả lời bằng giọng của bạn, chỉ link trang Google, không link app (board thường).
3. Reddit: chỉ sau khi đọc luật sub. Link phải có tag.
4. Tối: `npm run stats -- --since 2026-11-17`, ghi số vào một dòng nhật ký.
5. Ngày 7 (2026-11-23): so với ngưỡng Step 6 (script tự đánh dấu), rồi quyết định giữ hay đổi kênh.
