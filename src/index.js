// -- شروع تغییر ۱: افزودن کتابخانه jimp --
// ✅ کد صحیح برای استفاده در ویرایشگر داشبورد کلادفلر
import * as Jimp from "jimp"; // ✅ این روش صحیح است
// -- پایان تغییر ۱ --

//  اینجا تغییر کرد
// مقادیر ثابت را اینجا نگه می‌داریم
const FRAME_IMAGE_URLS = {
  frame1: "https://i.postimg.cc/C1BBK6h4/Parcham-Frame-1.png",
  frame2: "https://i.postimg.cc/SKsK0zCn/Parcham-Frame-2.png",
  frame3: "https://i.postimg.cc/bN4wwSGb/Parcham-Frame-3.png",
  frame4: "https://i.postimg.cc/HnzshzbR/Parcham-Bala-M3.png"
};

// متن اشتراک‌گذاری را به عنوان یک ثابت تعریف می‌کنیم
const SHARE_MESSAGE_TEXT = "یه ربات باحال پیدا کردم که می‌تونه پرچم سه رنگ ایران رو دور عکس پروفایلت بندازه! 🇮🇷\n\nهمین الان امتحانش کن:\n@parcham_bala_bot";


export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  }
};

// تابع شمارنده بدون تغییر باقی می‌ماند
async function incrementUserCount(env) {
  try {
    let count = await env.USER_COUNT_BALE.get("count");
    count = count ? parseInt(count) : 0;
    count++;
    await env.USER_COUNT_BALE.put("count", count.toString());
    return count;
  } catch (e) {
    console.error("Error incrementUserCount:", e);
    return 0;
  }
};

// تابع اصلی پردازش درخواست
async function handleRequest(request, env) {
  if (request.method !== "POST") {
    return new Response("Webhook فقط درخواست‌های POST را می‌پذیرد.", { status: 405 });
  }
  // در اینجا دیگر به IMGIX_DOMAIN نیازی نداریم
  const BOT_TOKEN = env.BOT_TOKEN_BALE;

  if (!BOT_TOKEN) {
    console.error("❌ خطای سرور: متغیر محیطی BOT_TOKEN_BALE تعریف نشده‌ است!");
    return new Response("Server configuration error", { status: 200 });
  }
  const update = await request.json();
  if (update.callback_query) {
    // IMGIX_DOMAIN دیگر به این تابع پاس داده نمی‌شود
    await handleCallbackQuery(update.callback_query, env, BOT_TOKEN);
    return new Response("Callback Query Handled", { status: 200 });
  }

  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    
    try {
      if (message.text) {
        if (message.text === "/help") {
          const helpText = `لطفاً تصویری ارسال کن که چهره‌ت به‌خوبی در مرکز تصویر قرار گرفته باشه. این کمک می‌کنه تا قاب دقیق‌تر و زیباتری روی عکس اعمال بشه. 📸🎨`;
          const deleteKeyboard = { inline_keyboard: [[{ text: "خوب فهمیدم", callback_data: "delete_this_message" }]] };
          await sendBaleMessage(chatId, helpText, BOT_TOKEN, deleteKeyboard);
          return new Response("راهنما ارسال شد.", { status: 200 });
        }
        const firstName = message.from.first_name || "کاربر عزیز";
        const userCount = await incrementUserCount(env);
        let welcomeText = '';
        if (userCount > 0) {
            welcomeText = `سلام ${firstName}! 👋 به پویش پرچم بالا خوش آمدید.\nبرای حمایت از *ایران جان* و برای تزئین تصویرتون با پرچم سه رنگ ایران عزیز، لطفا تصویر پروفایلتون رو ارسال کنید. \n تاکنون ${userCount} نفر در پویش شرکت کرده اند.`;
        } else {
            welcomeText = `سلام ${firstName}! 👋 به پویش پرچم بالا خوش آومدید.\nبرای حمایت از *ایران جان* و برای تزئین تصویرتون با پرچم سه رنگ ایران عزیز، لطفا تصویر پروفایلتون رو ارسال کنید. \n @parcham_bala_bot`;
        }
        await sendWelcomeMessage(chatId, welcomeText, BOT_TOKEN);
        return new Response("OK", { status: 200 });
      }

      let fileId = null;
      if (message.photo) { fileId = message.photo[message.photo.length - 1].file_id; } 
      else if (message.document && message.document.mime_type.startsWith("image/")) { fileId = message.document.file_id; }
      
      if (fileId) {
        await sendFrameSelectionMenu(chatId, fileId, BOT_TOKEN);
        return new Response("منوی انتخاب قاب ارسال شد.", { status: 200 });
      }
      
      await sendBaleMessage(chatId, "لطفاً یک متن یا تصویر برای پردازش ارسال کنید.", BOT_TOKEN);
      return new Response("OK", { status: 200 });

    } catch (error) {
      console.error("❌ خطای کلی در پردازش پیام:", error);
      try {
        await sendBaleMessage(chatId, "متاسفانه خطایی در پردازش رخ داد. لطفاً بعداً دوباره تلاش کنید.", BOT_TOKEN);
      } catch (e) {
        console.error("❌ خطای ارسال پیام خطا به کاربر:", e);
      }
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  return new Response("نوع آپدیت پشتیبانی نمی‌شود.", { status: 200 });
}

// تابع handleCallbackQuery با منطق جدید ادغام تصویر
async function handleCallbackQuery(callbackQuery, env, BOT_TOKEN) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const firstName = callbackQuery.from.first_name || "کاربر عزیز";
  const welcomeText = `سلام ${firstName}! 👋 به پویش پرچم بالا خوش آومدید.\nبرای حمایت از *ایران جان* و برای تزئین تصویرتون با پرچم سه رنگ ایران عزیز، لطفا تصویر پروفایلتون رو ارسال کنید. \n @parcham_bala_bot`;

  // ... (کدهای مربوط به share_message, delete_both, delete_this_message, welcome_tutorial, understood_tutorial, cancel بدون تغییر باقی می‌مانند)
  // ... (کپی پیست از کد اصلی شما)
  if (data === 'share_message') {
    await answerCallbackQuery(callbackQuery.id, BOT_TOKEN);
    await deleteMessage(chatId, messageId, BOT_TOKEN);
    const forwardableMessageResponse = await sendBaleMessage(chatId, SHARE_MESSAGE_TEXT, BOT_TOKEN, null);
    if (!forwardableMessageResponse || !forwardableMessageResponse.ok) {
      console.error("ارسال پیام قابل بازنشر ناموفق بود.");
      await sendBaleMessage(chatId, "خطا در آماده‌سازی پیام. لطفاً دوباره تلاش کنید.", BOT_TOKEN);
      return;
    }
    const forwardableMessageId = forwardableMessageResponse.result.message_id;
    const instructionText = "آماده شد! حالا پیام بالا را برای دوستانتان بازنشر (Forward) کنید.";
    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ انجام شد", callback_data: `delete_both:${forwardableMessageId}` }]
      ]
    };
    await sendBaleMessage(chatId, instructionText, BOT_TOKEN, keyboard);
    return;
  }
  if (data.startsWith('delete_both:')) {
    const forwardableMessageId = data.split(':')[1];
    await deleteMessage(chatId, messageId, BOT_TOKEN);
    await deleteMessage(chatId, forwardableMessageId, BOT_TOKEN);
    await answerCallbackQuery(callbackQuery.id, BOT_TOKEN, "پاکسازی انجام شد.");
    await sendWelcomeMessage(chatId, welcomeText, BOT_TOKEN);
    return;
  }
  if (data === 'delete_this_message') {
    await deleteMessage(chatId, messageId, BOT_TOKEN);
    await answerCallbackQuery(callbackQuery.id, BOT_TOKEN);
    return;
  }
  if (data === 'welcome_tutorial') {
    const tutorialText = `لطفاً تصویری ارسال کن که چهره‌ت به‌خوبی در مرکز تصویر قرار گرفته باشه. این کمک می‌کنه تا قاب دقیق‌تر و زیباتری روی عکس اعمال بشه. 📸🎨`;
    const understoodKeyboard = { inline_keyboard: [[{ text: "✅ فهمیدم", callback_data: "understood_tutorial" }]] };
    await editMessage(chatId, messageId, tutorialText, BOT_TOKEN, understoodKeyboard);
    return;
  }
  if (data === 'understood_tutorial') {
    const welcomeKeyboard = getWelcomeKeyboard();
    await editMessage(chatId, messageId, welcomeText, BOT_TOKEN, welcomeKeyboard);
    return;
  }
  if (data.startsWith('cancel')) {
    await editMessage(chatId, messageId, "عملیات لغو شد. ❌", BOT_TOKEN);
    return;
  }
  // -- شروع تغییرات اصلی در این تابع --

  const dataParts = data.split(":");
  const frameKey = dataParts.shift();
  const fileId = dataParts.join(":");

  if (!FRAME_IMAGE_URLS[frameKey] || !fileId) {
    await sendBaleMessage(chatId, "اطلاعات نامعتبر است. لطفاً دوباره امتحان کنید.", BOT_TOKEN);
    await editMessage(chatId, messageId, "انتخاب نامعتبر.", BOT_TOKEN);
    return;
  }

  await editMessage(chatId, messageId, "در حال ساخت تصویر شما با قاب انتخابی... ⏳", BOT_TOKEN);
  
  try {
    // 1. دریافت URL قابل دانلود عکس کاربر از سرور بله
    const userImageUrl = await getBaleFileUrl(fileId, BOT_TOKEN);
    const frameUrl = FRAME_IMAGE_URLS[frameKey];

    // 2. ادغام دو تصویر در حافظه و دریافت بافر تصویر نهایی
    const finalImageBuffer = await mergeImages(userImageUrl, frameUrl);
    
    // 3. ارسال تصویر نهایی به کاربر
    const captionText = "تصویر شما آماده شد.\nتا پای جان برای ایران🇮🇷 \n@parcham_bala_bot";
    await sendBalePhotoWithBuffer(chatId, finalImageBuffer, captionText, BOT_TOKEN);

    // 4. ارسال همان عکس به گروه (در صورت وجود)
    const groupChatId = env.GROUP_CHAT_ID;
    if (groupChatId) {
        const groupCaption = `کاربر ${firstName} با موفقیت تصویر پروفایل خود را ساخت. #پویش_پرچم_بالا`;
        await sendBalePhotoWithBuffer(groupChatId, finalImageBuffer, groupCaption, BOT_TOKEN);
        console.log(`✅ عکس با موفقیت به گروه ${groupChatId} ارسال شد.`);
    }

    // 5. ارسال پیام نهایی و پاک کردن پیام "در حال ساخت..."
    const finalKeyboard = {
        inline_keyboard: [
          [{ text: "🤝 معرفی به دوستان", callback_data: "share_message" }, 
           { text: "📋 کپی آیدی ربات", copy_text: { text: "@parcham_bala_bot" } }]
        ]
    };
    await deleteMessage(chatId, messageId,  BOT_TOKEN);
    await sendBaleMessage(chatId, " حالا نوبت شماست تا میتونی ربات رو به دوستات معرفی کنی...   ", BOT_TOKEN, finalKeyboard);
    await incrementUserCount(env);

  } catch (error) {
      console.error("❌ خطا در فرآیند ادغام و ارسال تصویر:", error);
      await editMessage(chatId, messageId, `متاسفانه خطایی رخ داد: ${error.message}. لطفاً دوباره تلاش کنید.`, BOT_TOKEN);
  }
  // -- پایان تغییرات اصلی --
}

// -- شروع تغییر ۲: توابع جدید برای پردازش تصویر --

/**
 * URL قابل دانلود یک فایل را از طریق file_id از سرور بله دریافت می‌کند.
 */
async function getBaleFileUrl(fileId, BOT_TOKEN) {
    const response = await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await response.json();
    if (!data.ok) {
        throw new Error("دریافت اطلاعات فایل از بله ناموفق بود.");
    }
    return `https://tapi.bale.ai/file/bot${BOT_TOKEN}/${data.result.file_path}`;
}

/**
 * دو تصویر را با استفاده از کتابخانه jimp در حافظه ادغام می‌کند.
 * @param {string} baseImageUrl - URL تصویر اصلی (عکس پروفایل کاربر).
 * @param {string} overlayImageUrl - URL تصویر رو (قاب PNG).
 * @returns {Promise<Buffer>} - بافر تصویر نهایی با فرمت PNG.
 */
async function mergeImages(baseImageUrl, overlayImageUrl) {
  try {
    // دانلود و خواندن هر دو تصویر به صورت همزمان
    const [baseImage, overlayImage] = await Promise.all([
      Jimp.read(baseImageUrl),
      Jimp.read(overlayImageUrl)
    ]);

    // تغییر اندازه تصویر پایه به ابعاد 512x512
    baseImage.resize(512, 512);

    // قرار دادن قاب روی تصویر پایه
    // composite قاب را در مختصات (0, 0) روی تصویر پایه قرار می‌دهد.
    baseImage.composite(overlayImage, 0, 0, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1
    });

    // دریافت نتیجه نهایی به صورت بافر PNG
    return await baseImage.getBufferAsync(Jimp.MIME_PNG);
  } catch (error) {
    console.error("خطا در ادغام تصاویر با Jimp:", error);
    throw new Error("پردازش تصویر با خطا مواجه شد.");
  }
}

/**
 * یک تصویر را از طریق بافر (Buffer) و به صورت multipart/form-data به بله ارسال می‌کند.
 */
async function sendBalePhotoWithBuffer(chatId, imageBuffer, caption, BOT_TOKEN) {
  const formData = new FormData();
  formData.append('chat_id', chatId.toString());
  formData.append('caption', caption);
  // بافر را به یک Blob تبدیل کرده و یک نام فایل برای آن تعیین می‌کنیم
  formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'parcham-bala-profile.png');

  const response = await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData, // هنگام استفاده از FormData، هدر Content-Type را دستی تنظیم نکنید
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('📤 ارسال عکس (بافر) به بله ناموفق بود:', result);
    throw new Error(`ارسال عکس به بله ناموفق بود: ${result.description}`);
  }
  return result;
}

// -- پایان تغییر ۲ --


// -- شروع تغییر ۳: حذف توابع غیر ضروری --

// این تابع دیگر استفاده نمی‌شود و باید حذف شود
// function createFinalImageUrlWithImgix(...) { ... }

// این تابع با sendBalePhotoWithBuffer جایگزین شده و باید حذف شود
// async function sendBalePhoto(...) { ... }

// -- پایان تغییر ۳ --

// سایر توابع (sendBaleMessage, editMessage, sendWelcomeMessage, sendFrameSelectionMenu, etc.) بدون تغییر باقی می‌مانند
// ... (کپی پیست از کد اصلی شما)
async function sendBaleMessage(chatId, text, BOT_TOKEN, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const response = await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await response.json();
}

async function editMessage(chatId, messageId, text, BOT_TOKEN, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text: text
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  } else {
    body.reply_markup = { inline_keyboard: [] };
  }
  await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function sendWelcomeMessage(chatId, welcomeText, BOT_TOKEN) {
  const keyboard = getWelcomeKeyboard();
  await sendBaleMessage(chatId, welcomeText, BOT_TOKEN, keyboard);
}

async function sendFrameSelectionMenu(chatId, fileId, BOT_TOKEN) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🖼️ قاب اول ", callback_data: `frame1:${fileId}` }, 
       { text: "🖼️ قاب دوم", callback_data: `frame2:${fileId}` }, 
       { text: "🖼️ قاب سوم", callback_data: `frame3:${fileId}` }],
      [{ text: "🏴 قاب محرمی", callback_data: `frame4:${fileId}` }],
      [{ text: "❌ لغو", callback_data: `cancel:${fileId}` }]
    ]
  };
  await sendBaleMessage(chatId, "حالا میتونید یکی از قابها را برای تصویر خود انتخاب کنید:", BOT_TOKEN, keyboard);
}

async function answerCallbackQuery(callbackQueryId, BOT_TOKEN, text = "") {
  await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false
    }),
  });
}

async function deleteMessage(chatId, messageId, BOT_TOKEN) {
  await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
}

function getWelcomeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📚 آموزش", callback_data: "welcome_tutorial" }, { text: "❌ لغو پیام", callback_data: "cancel" }],
      [{ text: "🤝 معرفی به دوستان", callback_data: "share_message" }, { text: "📋 کپی آیدی ربات", copy_text: { text: "@parcham_bala_bot" } }]
    ]
  };
}