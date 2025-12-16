import qrcode

# Website link
url = "https://linktr.ee/kanejohan?utm_source=linktree_admin_share"

# Create QR code
qr = qrcode.QRCode(
    version=1,  # controls size (1–40)
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # high error correction
    box_size=10,  # size of each box
    border=4,  # quiet zone
)

qr.add_data(url)
qr.make(fit=True)

# Generate image
img = qr.make_image(
    fill_color="black",  # dark gray / brand color
    back_color="white"
)

img.save("website_qr_branded.png")

# Save QR code
img.save("website_qr.png")

print("QR code generated successfully!")

# import qrcode

# url = "grewbie.com"

# qr = qrcode.QRCode(
#     version=1,
#     error_correction=qrcode.constants.ERROR_CORRECT_H,
#     box_size=10,
#     border=4,
# )

# qr.add_data(url)
# qr.make(fit=True)

# # Transparent background
# img = qr.make_image(
#     fill_color="white",
#     back_color=None
# ).convert("RGBA")

# # Make background transparent explicitly
# datas = img.getdata()
# new_data = []
# for item in datas:
#     # Replace white background with transparent
#     if item[:3] == (255, 255, 255):
#         new_data.append((255, 255, 255, 0))
#     else:
#         new_data.append(item)

# img.putdata(new_data)
# img.save("website_qr_transparent.png")

# print("Transparent QR code generated!")
