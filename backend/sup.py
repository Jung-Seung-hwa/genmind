import time
import tkinter as tk
from PIL import Image, ImageTk

# ====== 설정 ======
IMAGE_PATH = "sup.png"  # 띄울 사진 경로
WAIT_TIME = 5              # 5분 (초 단위)
# ==================

# 1. 대기
# print("5분 뒤에 사진이 강제로 뜹니다...")
time.sleep(WAIT_TIME)

# 2. 윈도우 생성
root = tk.Tk()
root.attributes("-fullscreen", True)   # 전체화면
root.attributes("-topmost", True)      # 항상 최상단 유지
root.configure(bg="black")

# 3. 화면 크기 강제 갱신
root.update_idletasks()
screen_w = root.winfo_screenwidth()
screen_h = root.winfo_screenheight()

# 4. 이미지 로드 및 리사이즈
img = Image.open(IMAGE_PATH).resize((screen_w, screen_h))
photo = ImageTk.PhotoImage(img)

label = tk.Label(root, image=photo)
label.pack(fill="both", expand=True)

# 5. ESC 누르면 종료
root.bind("<Escape>", lambda e: root.destroy())

# 6. 메인루프 실행 (강제 전체 화면)
root.mainloop()
