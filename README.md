# AutoForm Local

Chrome Extension Manifest V3 giúp người dùng điền biểu mẫu bằng dữ liệu thật do chính họ cung cấp. Extension chạy JavaScript trực tiếp trên tab hiện tại, không cần website hoặc backend trung gian.

Phiên bản `0.2.0` tự nạp trên mọi website HTTP/HTTPS. Bấm biểu tượng extension ở bất kỳ tab web nào để bật hoặc tắt cửa sổ nổi.

## Chức năng hiện có

- Lưu hồ sơ trong `chrome.storage.session` hoặc, khi người dùng chủ động chọn, `chrome.storage.local`.
- Chỉ xin quyền truy cập website đang mở.
- Tự nhận diện các trường phổ biến bằng `label`, `name`, `id`, `placeholder`, `aria-label` và `autocomplete`.
- Hỗ trợ selector chính xác theo từng website bằng quy tắc JSON.
- Hỗ trợ thao tác `click`, `waitFor` và `pause` do người dùng khai báo.
- Luôn dừng ở CAPTCHA, SSO và vùng tải tài liệu.
- Mặc định không bấm nút Submit/Confirm cuối cùng.
- Ghép dữ liệu vào phôi `.txt`, `.html`, `.md` hoặc `.csv` với placeholder `{{fieldName}}`.
- Không có request gửi dữ liệu tới máy chủ bên ngoài và không tải mã JavaScript từ xa.

## Cài đặt để thử

1. Mở `chrome://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục dự án này.
5. Mở một trang form rồi bấm biểu tượng **AutoForm Local**. Cửa sổ extension sẽ nổi ở góc trên bên phải của trang.

### Quyền truy cập đặc biệt

- Trang Ẩn danh: mở **Chi tiết** của extension và bật **Cho phép ở chế độ ẩn danh**.
- File cục bộ `file://`: mở **Chi tiết** và bật **Cho phép truy cập vào URL của tệp**.
- Chrome không cho content script chạy trên `chrome://`, Chrome Web Store, trang New Tab hệ thống và một số trang nội bộ. Đây là giới hạn của trình duyệt, không thể mở rộng bằng manifest.

## Quy trình sử dụng

1. Nhập hồ sơ ở tab **Hồ sơ** và bấm **Lưu hồ sơ**.
2. Mở form cần điền và bấm biểu tượng extension để bật cửa sổ nổi.
3. Ở tab **Tự động**, bấm **Quét form**. Nếu trang chưa được kết nối, chọn **Kết nối**.
4. Kiểm tra danh sách ánh xạ trước khi bấm **Điền thông tin**.
5. Nếu trang cần selector riêng, chỉnh quy tắc JSON và bấm **Chạy quy tắc**.

Ví dụ quy tắc nằm tại `examples/form-rule.json`.

## Cú pháp quy tắc

```json
{
  "match": "https://example.edu/verify/*",
  "fields": {
    "#first-name": "firstName",
    "#student-id": "studentId"
  },
  "actions": [
    { "type": "click", "selector": "button.next", "delayMs": 500 },
    { "type": "waitFor", "selector": "form.step-2", "timeoutMs": 5000 }
  ]
}
```

Field key chuẩn gồm `firstName`, `lastName`, `fullName`, `birthDate`, `birthDay`, `birthMonth`, `birthYear`, `email`, `phone`, `studentId`, `schoolName`, `graduationDate`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`. Trường tùy chỉnh dùng cú pháp `custom.tenTruong`.

## Trình tạo Phôi Thẻ Sinh Viên HUCE (Đại học Xây dựng Hà Nội)

Dự án cung cấp công cụ tạo phôi thẻ sinh viên HUCE chân thực ([huce-card-generator.html](file:///d:/LuuCode1/Extension_Verify_GG1/huce-card-generator.html)) với các quy luật logic đồng bộ 100%:

- **Quy luật Email**: `[Tên không dấu][MSSV]@huce.edu.vn` (ví dụ `duc0174268@huce.edu.vn`).
- **Quy luật MSSV**: 7 chữ số dạng `01[3 số ngẫu nhiên][2 số cuối của Khóa]` (ví dụ Khóa 68 -> `0174268`).
- **Quy luật Khóa & Niên khóa**: K68 (2023 - 2027, sinh 2005), K69 (2024 - 2028, sinh 2006), K67 (2022 - 2026, sinh 2004)...
- **Quy luật Lớp & Khoa**: Ghép số khóa + mã chuyên ngành (ví dụ Khoa Kinh tế & QLXD -> `68QD1`, `68KT1`, `68QX1`...).
- **Tùy chọn Avatar**:
  1. *Lấy nguyên từ phôi*: Sử dụng trực tiếp ảnh chân dung gốc của bạn sinh viên trong ảnh mẫu.
  2. *Random ảnh thẻ*: Tự động chọn ảnh chân dung chuẩn thẻ sinh viên (áo sơ mi trắng, phông xanh) theo giới tính Nam/Nữ.
  3. *Tải ảnh từ máy / Kéo thả*: Hỗ trợ tải ảnh bất kỳ hoặc dán trực tiếp (Ctrl+V).
- **Xuất ảnh chất lượng cao**:
  - Xuất ảnh PNG độ phân giải cao (Canvas 3x siêu nét 1140 x 1806px).
  - Sao chép ảnh vào Clipboard.
  - In ấn trực tiếp theo khổ thẻ tiêu chuẩn ID-1 (54mm x 85.6mm).
  - Xuất JSON hồ sơ tương thích với AutoForm Local.
  - Phôi mẫu HTML tích hợp nằm tại [examples/huce-card-template.html](file:///d:/LuuCode1/Extension_Verify_GG1/examples/huce-card-template.html).

## Kiểm thử

Yêu cầu Node.js 18 trở lên:

```powershell
npm test
```

## Phạm vi hiện tại

Phôi `.docx` và `.pdf` chưa được chỉnh trực tiếp trong bản MVP; bản này xử lý phôi văn bản/HTML. Muốn hỗ trợ một trang cụ thể ổn định, cần HTML hoặc selector của từng bước trên trang đó.

"# EXT_VER_GG1" 
