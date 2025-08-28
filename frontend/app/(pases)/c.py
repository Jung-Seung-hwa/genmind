import tkinter as tk
import pyautogui
from PIL import Image, ImageTk
import time

# 바탕화면 스크린샷
screenshot = pyautogui.screenshot()
screenshot.save("capture.png")

# 잠깐 대기 후 실행
time.sleep(5)

# 전체화면 창 만들기
root = tk.Tk()
root.attributes("-fullscreen", True)
root.attributes("-topmost", True)
root.overrideredirect(True)

# 바탕화면처럼 보이게 스크린샷 표시
bg_img = Image.open("capture.png")
bg_photo = ImageTk.PhotoImage(bg_img)

label = tk.Label(root, image=bg_photo)
label.pack()

# 어두운 반투명 검은색 레이어 덮기
canvas = tk.Canvas(root, width=root.winfo_screenwidth(), height=root.winfo_screenheight(), bg='black')
canvas.place(x=0, y=0)
canvas.configure(highlightthickness=0)

# 점점 어두워지게 (투명도 증가)
for i in range(0, 100):
    canvas.configure(bg=f'#000000{hex(i)[2:].zfill(2)}')  # 00 → 64 정도로 어둡게
    root.update()
    time.sleep(0.02)

# 진짜 먹통처럼 보이게 마우스 클릭 방지
def block_input(event):
    return "break"

root.bind_all("<Button>", block_input)
root.bind_all("<Key>", block_input)

root.mainloop()
