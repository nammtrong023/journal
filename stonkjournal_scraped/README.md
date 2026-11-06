# Stonk Journal Scraped Archive

Trang web mục tiêu: **https://v2.stonkjournal.com/dashboard**  
Thời điểm cào: **04/11/2026**  
Công nghệ web: **Nuxt 3 (Vue 3) + Tailwind CSS + Supabase (PostgreSQL / REST RPC) + IndexedDB (Local cache)**

---

## Cấu trúc thư mục

```
stonkjournal_scraped/
├── data/                               # Dữ liệu tài khoản & giao dịch thực tế từ IndexedDB/Supabase
│   ├── accounts.json                   # Cấu hình tài khoản (Default account, balance, is_live,...)
│   ├── trades.json                     # Danh sách các lệnh giao dịch (Symbol, Market, Entry, Exit, P&L, Status,...)
│   ├── tradeSetups.json                # Danh sách chiến lược / Setup giao dịch
│   ├── dayJournal.json                 # Nhật ký giao dịch hàng ngày (Day Notes / Psychological state)
│   └── tags.json                       # Tags (Setup, Emotion, Mistake)
│
├── pages_html/                         # Toàn bộ mã nguồn HTML đã render hoàn chỉnh theo từng trang
│   ├── 01_dashboard.html               # Trang Dashboard chính (bảng lệnh, thống kê nhanh, thanh lọc thời gian)
│   ├── 02_stats.html                   # Trang Thống kê chi tiết (13 chỉ số hiệu suất, Sharpe, Stonk Score,...)
│   ├── 03_calendar.html                # Trang Lịch giao dịch theo tháng & tuần (P&L heatmap, Win/Loss record)
│   ├── 04_settings.html                # Trang Cài đặt tài khoản (Currency, Phí commission, FIFO/LIFO, Leverage)
│   ├── 05_accounts.html                # Trang Quản lý danh sách tài khoản giao dịch
│   ├── 06_rules.html                   # Trang Risk Management Rules (Quy tắc quản trị rủi ro & kỷ luật)
│   └── 07_tags.html                    # Trang Quản lý Tags phân loại lệnh
│
├── forms_and_modals/                   # Chi tiết các Modal Form tạo mới (HTML + JSON Schema các trường nhập)
│   ├── new_trade_modal.html            # Modal giao diện tạo lệnh giao dịch mới
│   ├── new_trade_schema.json           # 57 trường dữ liệu nhập (Symbol, Price, Qty, Target, Stop, Setup,...)
│   ├── new_setup_modal.html            # Modal tạo chiến lược giao dịch (Setup)
│   ├── new_setup_schema.json           # 26 trường thuộc tính của Setup
│   ├── new_note_modal.html             # Modal ghi chép nhật ký hàng ngày (Note)
│   └── new_note_schema.json            # 30 trường thuộc tính của Note
│
└── components_and_ui/                  # Thành phần giao diện & Tài nguyên Stylesheet
    ├── sidebar_navigation.html         # Giao diện thanh Menu bên trái (Sidebar)
    ├── dashboard_widgets.json          # Đặc tả cấu trúc các widget trên Dashboard
    ├── stats_breakdown.json            # Đặc tả công thức & các khối phân tích trên trang Stats
    └── css/                            # Toàn bộ các file stylesheet Tailwind / Nuxt CSS gốc
        ├── entry.BOxwQDOf.css          # Core Tailwind CSS classes (245 KB)
        ├── default.Q7A0JfEp.css        # Layout styling
        ├── DetailSlideover.CoTnPByX.css# Slide-over component style
        ├── DateTimePicker.hUPNeF8k.css # Date-picker component style
        ├── FilterModal.Cddf5bby.css    # Filter modal style
        └── ProfitCalculatorTool.BQXgCb3M.css # Calculator tool style
```

---

## Chi tiết các phần quan trọng đã trích xuất

### 1. Dashboard (`/dashboard`)
*   **Thanh lọc thời gian:** `30D`, `90D`, `180D`, `ALL`.
*   **KPI Bar:**
    *   WINS (% & số lượng)
    *   OPEN (% & số lượng)
    *   LOSSES (% & số lượng)
    *   WASH (% & số lượng)
    *   AVG WIN ($ & %)
    *   AVG LOSS ($ & %)
    *   Realized in period ($ & %)
*   **Bảng giao dịch (Trade Table Columns):**
    *   `DATE`: Ngày vào lệnh
    *   `SYMBOL`: Mã tài sản
    *   `STATUS`: Trạng thái (OPEN, CLOSED, CANCELLED)
    *   `DIR`: Hướng (LONG ↗, SHORT ↘)
    *   `MARKET`: Loại thị trường (STK - Stock, CRYPTO, FOREX, FUTURES, OPTIONS)
    *   `QTY`: Khối lượng
    *   `ENTRY`: Giá vào
    *   `EXIT`: Giá thoát
    *   `ENT TOT`: Tổng vốn vào (Entry Total)
    *   `EXT TOT`: Tổng tiền thu về (Exit Total)
    *   `POS`: Vị thế
    *   `HOLD`: Thời gian giữ lệnh
    *   `RETURN`: Lợi nhuận ròng ($)
    *   `RETURN %`: Tỷ suất sinh lời (%)

### 2. Statistics (`/stats`)
Bao gồm 13 chỉ số thống kê hiệu suất cốt lõi:
1.  **P&L:** Tổng lãi/lỗ ròng.
2.  **Win Rate:** Tỷ lệ lệnh thắng / tổng lệnh đóng.
3.  **Profit Factor:** Tổng lãi gộp / Tổng lỗ gộp.
4.  **Adj. Win/Loss Ratio:** Tỷ lệ R:R điều chỉnh theo xác suất.
5.  **Sharpe (per trade):** Hệ số Sharpe tính theo từng giao dịch.
6.  **Total Trades:** Tổng số lệnh.
7.  **Avg Win & Avg Loss:** Trung bình lãi / lỗ mỗi lệnh.
8.  **Largest Win & Largest Loss:** Lệnh thắng lớn nhất / thua lớn nhất.
9.  **Expectancy:** Kỳ vọng toán học mỗi lệnh: $(Win\% \times AvgWin) - (Loss\% \times AvgLoss)$.
10. **Avg Win Hold & Avg Loss Hold:** Thời gian nắm giữ trung bình của lệnh thắng vs lệnh thua.
11. **Stonk Score:** Điểm số giao dịch tổng hợp (kích hoạt sau 20 lệnh đóng).
12. **Rolling Win Rate:** Win rate trượt theo khung 10, 20, 50, 100 lệnh.
13. **Rule Compliance Impact:** Tương quan giữa việc tuân thủ luật kỷ luật và hiệu suất lợi nhuận.

### 3. Calendar (`/calendar`)
*   Hiển thị theo tháng dạng lưới lịch chuẩn.
*   Mỗi ngày hiển thị tổng P&L ($) và màu sắc xanh/đỏ tương ứng.
*   Cột tổng kết theo từng tuần (Weekly P&L).
*   Chỉ số đầu tháng: Month P&L, Win rate tháng, Record (Wins · Losses), Profit factor.

### 4. Settings & Risk Management
*   **Settings (`/account/settings`):** Cấu hình tiền tệ (Currency), Thị trường mặc định, Cách tính phí hoa hồng (Flat, Per Share, Percent), Phương pháp kế toán (FIFO, LIFO), Cách tính P&L (ROIC, Return on Margin).
*   **Rules (`/account/rules`):** Định nghĩa các bộ quy tắc quản trị rủi ro theo 4 nhóm:
    *   *Risk / Sizing* (Kích thước vị thế, Stop-loss bắt buộc, Daily loss limit).
    *   *Discipline / Entry* (Điểm vào lệnh theo kế hoạch, không FOMO).
    *   *Behavior* (Tâm lý giao dịch, dừng giao dịch sau chuỗi thua).
    *   *Trading Sessions* (Chỉ giao dịch trong khung giờ cho phép).
*   **Tags (`/account/tags`):** 3 nhóm tag chính điều khiển form vào lệnh: `Setup`, `Emotion`, `Mistake`.

---

## Các mục đã loại bỏ theo yêu cầu:
*   ❌ **Import / Export** (Bỏ qua)
*   ❌ **AI Coach [PRO]** (Bỏ qua)
*   ❌ **Help** (Bỏ qua)
