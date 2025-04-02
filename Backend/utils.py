from passlib.context import CryptContext
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import UploadFile, HTTPException
from PIL import Image
import io
import os

import smtplib

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "velvetvalpo@gmail.com"
EMAIL_PASSWORD = "srasrfvhbaevwmfe"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare the plain password with the hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def send_email_notification(to_email: str, subject: str, body: str):
    sender_email = EMAIL_SENDER  # Use the sender email defined in your config
    password = EMAIL_PASSWORD      # Use the sender email password defined in your config

    # Create the email message
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject

    # Attach the email body
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Set up the server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Use TLS
        server.login(sender_email, password)  # Log in to the server

        # Send the email
        server.sendmail(sender_email, to_email, msg.as_string())
        print("Email sent successfully")

    except Exception as e:
        print(f"Failed to send email: {e}")

    finally:
        server.quit()  # Close the server connection

def validate_image(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file format. Only JPG and PNG are allowed")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size too large. Max 5MB")

    try:
        img = Image.open(io.BytesIO(file.file.read()))
        img.verify()
        file.file.seek(0)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")