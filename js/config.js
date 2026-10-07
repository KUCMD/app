// Firebase configuration — project: kuwait-uni
export const firebaseConfig = {
  apiKey: "AIzaSyBmUEwkVyXRrPHau5je3CTFUESzgymFG7A",
  authDomain: "kuwait-uni.firebaseapp.com",
  projectId: "kuwait-uni",
  storageBucket: "kuwait-uni.firebasestorage.app",
  messagingSenderId: "461422607406",
  appId: "1:461422607406:web:9d52cbbcea6c9e1a0db3bf"
};

// Department constants
export const HOTLINE = "24986888";        // الإبلاغ الفوري عن شكاوى الصيانة
export const WHATSAPP = "96524986888";    // WhatsApp number in international format (edit if different)
export const INSTAGRAM = "cm-department";
export const UNIVERSITY_EMAIL_DOMAIN = "ku.edu.kw"; // used to validate university e-mails on registration

// Photo / document attachments need Firebase Storage (Blaze plan). Set to false to hide the attachment buttons until Storage is enabled.
export const ATTACHMENTS_ENABLED = true;
