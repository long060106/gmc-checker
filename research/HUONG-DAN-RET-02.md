# Hướng dẫn: tự viết check RET-02 (khoảng 30–45 phút)

Mục tiêu: viết hàm `checkRefundContent`. Hàm này kiểm tra trang refund policy có nói đủ 4 điều Google yêu cầu hay không: **thời hạn đổi trả**, **cách gửi trả**, **phí ship khi trả hàng** và **thời gian hoàn tiền**. Nguồn là trang [Editorial của Google](https://support.google.com/merchants/answer/17233876), mục "Missing return and refund policy".

Mọi thứ khác đã được dựng sẵn. Bạn chỉ sửa **2 file**:
- `gmc-app/app/engine/checks/policies.ts`: viết hàm vào đây.
- `gmc-app/app/engine/run.ts`: bỏ comment một dòng để đăng ký hàm.

---

## Bước 0: Chạy test hiện có (2 phút)
```bash
cd "gmc-app"
npm test
```
Kết quả đúng là **49 passed**. Đây là mốc ban đầu: nếu sau khi bạn sửa mà có test cũ bị đỏ, nghĩa là bạn đã làm hỏng thứ khác.

## Bước 1: Viết test TRƯỚC (10 phút)
Tạo file `app/engine/checks/policies.ret02.test.ts`:
```ts
import { expect, it } from "vitest";
import { checkRefundContent } from "./policies";
import { page, policy, snap } from "./fixtures";

const refund = (body: string) => snap({ pages: { refund: page(policy(body), "/policies/refund-policy") } });

it("pass khi đủ 4 ý", () => {
  const body = "Returns within 30 days by mail with our return label. Return shipping is free. " +
               "Refunds are processed to the original payment method.";
  expect(checkRefundContent(refund(body), {}).status).toBe("pass");
});

it("fail khi chỉ có một câu", () => {
  expect(checkRefundContent(refund("All sales final."), {}).status).toBe("fail");
});

it("na khi không có trang refund (RET-01 đã báo lỗi này rồi)", () => {
  expect(checkRefundContent(snap(), {}).status).toBe("na");
});
```
Chạy `npm test`. Test **phải đỏ** (fail), vì hàm chưa tồn tại.

**Tại sao viết test trước:** test chính là bản đặc tả (spec): bạn viết ra "đúng" trông như thế nào trước khi code. Nếu viết code trước, bạn dễ viết test theo kiểu "code ra gì thì test nấy", và test đó không bắt được lỗi nào.

## Bước 2: Viết hàm (15 phút)
Mở `policies.ts` và tìm dòng `// TODO(Long): RET-02 ...`. Thay dòng đó bằng code dưới đây. **Hãy tự gõ lại, đừng copy:** gõ tay thì bạn mới đọc kỹ từng phần.

```ts
const REFUND_SIGNALS: Record<string, RegExp> = {
  window: /\b\d{1,3}\s*(?:-\s*)?(?:calendar |business )?days?\b/i,
  method: /\b(?:by mail|ship (?:it|them|items?) back|return label|drop[- ]?off|in[- ]store)\b/i,
  fees:   /\b(?:free returns?|return shipping|restocking fee|customer'?s? (?:own )?expense)\b/i,
  refund: /\b(?:refunds? (?:are|will be) (?:processed|issued)|original (?:payment|method))\b/i,
};

// RET-02 — refund policy covers window, return method, fees and refund timing.
export const checkRefundContent: CheckFn = (s) => {
  const base = { checkId: "RET-02", googleRef: REF.editorial, shopifyFix: FIX.refund };
  const p = s.pages.refund;
  if (!ok(p)) return { ...base, status: "na", evidence: "No readable refund policy page (see RET-01)" };
  const text = mainText(p.html);
  const missing = Object.keys(REFUND_SIGNALS).filter((k) => !REFUND_SIGNALS[k].test(text));
  if (!missing.length) return { ...base, status: "pass", evidence: "Found window, method, fees and refund timing" };
  return { ...base, status: missing.length === 1 ? "warn" : "fail", evidence: `Could not find: ${missing.join(", ")}` };
};
```

Giải thích từng phần, có so sánh với C++:
| Dòng | Ý nghĩa | Tương đương C++ |
|---|---|---|
| `Record<string, RegExp>` | Map từ tên sang biểu thức chính quy (regex) | `std::unordered_map<std::string, std::regex>` |
| `/.../i` | Regex, chữ `i` nghĩa là không phân biệt hoa thường | `std::regex(..., std::regex::icase)` |
| `export const checkRefundContent: CheckFn = (s) => {...}` | Hàm mũi tên (arrow function) có kiểu `CheckFn` | Free function nhận `const StoreSnapshot&` |
| `{ ...base, status }` | Spread: copy mọi field của `base` rồi thêm `status` | Copy một struct rồi gán thêm field |
| `ok(p)` | Trả về true nếu trang tải được (HTTP 200) | Kiểm tra pointer khác `nullptr` và status hợp lệ |
| `mainText(p.html)` | Chỉ lấy phần thân của policy, bỏ header và footer | – |
| `.filter(...)` | Giữ lại các key có regex **không** khớp | `std::copy_if` |

**Tại sao viết như vậy:**
- **`na` thay vì `fail` khi thiếu trang:** RET-01 đã báo lỗi thiếu trang. Nếu RET-02 cũng báo `fail`, một lỗi bị tính hai lần, báo cáo trông tệ hơn thực tế và merchant mất lòng tin.
- **Thiếu 1 ý chỉ là `warn`:** regex có thể bỏ sót cách viết khác, ví dụ "two weeks" thay cho "14 days". Báo `fail` khi mình không chắc là lỗi báo sai (false positive), đúng thứ khách đã chê ShieldKit.
- **Luôn có `evidence`:** nhờ phần bằng chứng, merchant tự kiểm tra lại được mình có báo sai không.

## Bước 3: Đăng ký hàm và chạy test (3 phút)
Mở `run.ts`:
1. Thêm `checkRefundContent` vào dòng `import { ... } from "./checks/policies"`.
2. Bỏ comment dòng `// ["RET-02", checkRefundContent], ...`.

Sau đó chạy `npm test`. Kết quả đúng là **52 passed** (49 test cũ + 3 test mới).

**Nếu bị đỏ:**
- Báo `checkRefundContent is not a function`: bạn quên `export`.
- Báo lỗi import trong `run.ts`: kiểm tra lại tên hàm và dấu ngoặc nhọn `{ }`.
- Test "pass khi đủ 4 ý" ra `warn`: đọc `evidence` để biết thiếu ý nào, rồi so câu tiếng Anh trong test với regex tương ứng.

## Bước 4: Thử tự phá (5 phút, quan trọng)
Đổi câu trong test "pass" thành `"Returns accepted within two weeks"`, rồi chạy lại. Hàm báo gì, và vì sao? Đây là giới hạn của regex. Hãy ghi lại cách bạn định xử lý trường hợp này, rồi gửi mình review cùng với CON-02.

> Tóm tắt: viết test trước (đỏ) → viết hàm → đăng ký vào `run.ts` → 52 test xanh → thử phá để thấy giới hạn của regex.
