// =============================================
//  Supabase Config
//  Setup steps: see README or ask Antigravity
//  The anon key is SAFE to expose - RLS only allows inserts
// =============================================

const SUPABASE_CONFIG = {
    url:     "https://bqkxkiijcuqowzyipniu.supabase.co",             // Project URL
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxa3hraWlqY3Vxb3d6eWlwbml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzAxNzIsImV4cCI6MjA5MDU0NjE3Mn0.FTiQ4PkKXy82HmT4USQjqPqC_tPriKOs3h14HrQ2MLc",       // anon/public key
    table:   "report",
};

// =============================================
//  Eye Animation
// =============================================

const eyeWrappers = document.querySelectorAll('.eye-wrapper');
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function moveEyes() {
    const eyeMoves = [];

    eyeWrappers.forEach((wrapper) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        const moveX = Math.cos(angle) * 12; // keep movement subtle inside small window
        const moveY = Math.sin(angle) * 12;

        eyeMoves.push({ wrapper, moveX, moveY });
    });

    eyeMoves.forEach(item => {
        item.wrapper.style.transition = "transform 0.75s ease-out";
        item.wrapper.style.transform = `translate(${item.moveX}px, ${item.moveY}px)`;

        setTimeout(() => {
            item.wrapper.style.transition = "transform 2s ease-in-out";
            item.wrapper.style.transform = `translate(0px, 0px)`;
        }, 1500);
    });
}

setInterval(moveEyes, 4000);


// =============================================
//  Report Window — open / close / toggle
// =============================================

let reportWindowOpen = false;
let currentTopic = "";  // tracks the topic selected in step 1

function openReportWindow() {
    const win = document.getElementById("report-window");
    if (reportWindowOpen) {
        win.style.display = "none";
        reportWindowOpen = false;
    } else {
        win.style.display = "flex";
        reportWindowOpen = true;
    }
}

function closeReportWindow() {
    document.getElementById("report-window").style.display = "none";
    reportWindowOpen = false;
}


// =============================================
//  Report Window — step-by-step state machine
// =============================================

function selectTopic(topic) {
    currentTopic = topic;   // remember for submitReport()

    document.getElementById("report-topic-buttons").style.display = "none";
    document.getElementById("reporttext001").textContent = "> " + topic;
    document.getElementById("reporttext001").classList.add("report-topic-selected");
    document.getElementById("reporttext002").textContent = getTopicPrompt(topic);
    document.getElementById("report-input-area").style.display = "flex";
    document.getElementById("report-message").focus();
}

function getTopicPrompt(topic) {
    if (topic === "聯絡我們")           return "> 請問你要告訴我們什麼？（請不要告我，這只是工具  ┌( ´_ゝ` )┐）";
    if (topic === "回報錯誤or建議")     return "> 請描述錯誤或建議的內容：";
    if (topic === "我想要改造建築物")   return "> 真的嗎？請提供聯絡方式，作者會盡量聯絡你（當然不會泄露你的資料，我也不知道要幹嘛）：";
    return "> 請輸入你的訊息：";
}

function resetReport() {
    // Go back to step 1
    document.getElementById("report-topic-buttons").style.display = "flex";
    document.getElementById("report-input-area").style.display = "none";
    document.getElementById("reporttext001").textContent = "> 有什麼事嗎？";
    document.getElementById("reporttext001").classList.remove("report-topic-selected");
    document.getElementById("reporttext002").textContent = "> 請選擇類型：";
    document.getElementById("report-message").value = "";
}

async function submitReport() {
    const msg = document.getElementById("report-message").value.trim();
    if (!msg) {
        document.getElementById("report-message").style.border = "1px solid #f44336";
        return;
    }

    // Disable button while submitting
    const sendBtn = document.querySelector(".report-send-btn");
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = "送出中…"; }

    const record = {
        type:    currentTopic || "未分類",
        message: msg,
        time:    new Date().toISOString(),   // e.g. "2026-03-31T01:33:00.000Z"
    };

    try {
        const res = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}`,
            {
                method:  "POST",
                headers: {
                    "apikey":        SUPABASE_CONFIG.anonKey,
                    "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    "Content-Type":  "application/json",
                    "Prefer":        "return=minimal",
                },
                body: JSON.stringify(record),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`HTTP ${res.status}: ${err}`);
        }

        // ── Success ──
        document.getElementById("report-topic-buttons").style.display = "none";
        document.getElementById("report-input-area").style.display = "none";
        document.getElementById("reporttext001").textContent = "> 謝謝！w(ﾟДﾟ)w";
        document.getElementById("reporttext001").classList.add("report-topic-selected");
        document.getElementById("reporttext002").textContent = "> 收到！";
        setTimeout(resetReport, 4000);

    } catch (err) {
        console.error("[report] Failed to submit:", err);
        document.getElementById("reporttext002").textContent = "> 提交失敗，請稍後再試下 w(ﾟДﾟ)w";
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "送出"; }
    }
}


// =============================================
//  Draggable Window
// =============================================

dragElement(document.getElementById("report-window"));

function dragElement(elmnt) {
    if (!elmnt) return; // null-guard: don't crash if element missing

    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById(elmnt.id + "-header");

    if (header) {
        header.style.cursor = "move";
        // Mouse events
        header.onmousedown = dragMouseDown;
        // Touch events
        header.addEventListener("touchstart", dragTouchStart, { passive: false });
    } else {
        elmnt.onmousedown = dragMouseDown;
        elmnt.addEventListener("touchstart", dragTouchStart, { passive: false });
    }

    // -- Mouse Logic --
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        initDragPos(e.clientX, e.clientY);
        document.onmouseup   = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        calculateAndMove(e.clientX, e.clientY);
    }

    function closeDragElement() {
        document.onmouseup   = null;
        document.onmousemove = null;
    }

    // -- Touch Logic --
    function dragTouchStart(e) {
        // e.preventDefault(); // Don't prevent default blindly; it might block legitimate clicks inside, but we need it on the header specifically. 
        if (e.target === header || header.contains(e.target)) {
            // we only care if it's strictly the header area dragging
        }
        initDragPos(e.touches[0].clientX, e.touches[0].clientY);
        document.addEventListener("touchend", closeTouchDragElement);
        document.addEventListener("touchmove", touchDrag, { passive: false });
    }

    function touchDrag(e) {
        e.preventDefault(); // crucial on mobile to prevent page scrolling while dragging window
        calculateAndMove(e.touches[0].clientX, e.touches[0].clientY);
    }

    function closeTouchDragElement() {
        document.removeEventListener("touchend", closeTouchDragElement);
        document.removeEventListener("touchmove", touchDrag);
    }

    // -- Shared Math --
    function initDragPos(clientX, clientY) {
        const rect = elmnt.getBoundingClientRect();
        elmnt.style.top       = rect.top  + "px";
        elmnt.style.left      = rect.left + "px";
        elmnt.style.transform = "none"; // disable the translate(-50%,-50%) centering

        pos3 = clientX;
        pos4 = clientY;
    }

    function calculateAndMove(clientX, clientY) {
        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        elmnt.style.top  = (elmnt.offsetTop  - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
}
