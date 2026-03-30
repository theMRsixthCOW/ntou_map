const eyeWrappers = document.querySelectorAll('.eye-wrapper');
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

// Track mouse position
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function moveEyes() {
    // Store proposed moves to check for collisions
    const eyeMoves = [];
    const eyeCenters = [];

    // 1. Calculate proposed moves
    eyeWrappers.forEach((wrapper, index) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        eyeCenters.push({ x: centerX, y: centerY });

        // Calculate angle towards mouse
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        
        // Move 2cm (approx 75px) towards pointer
        const moveX = Math.cos(angle) * 75;
        const moveY = Math.sin(angle) * 75;

        eyeMoves.push({ 
            wrapper, 
            moveX, 
            moveY,
            proposedX: centerX + moveX, 
            proposedY: centerY + moveY 
        });
    });

    // 2. Check and Resolve Collision
    if (eyeMoves.length === 2) {
        const p1 = eyeMoves[0];
        const p2 = eyeMoves[1];
        
        const dx = p2.proposedX - p1.proposedX;
        const dy = p2.proposedY - p1.proposedY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 85; // 80px diameter + 5px margin

        if (distance < minDistance) {
            // Collision detected! Push them apart.
            const overlap = minDistance - distance;
            const angle = Math.atan2(dy, dx); // Angle from p1 to p2
            
            const pushX = Math.cos(angle) * (overlap / 2);
            const pushY = Math.sin(angle) * (overlap / 2);
            
            p1.moveX -= pushX;
            p1.moveY -= pushY;
            p2.moveX += pushX;
            p2.moveY += pushY;
        }
    }

    // 3. Apply moves
    eyeMoves.forEach(item => {
        // Phase 1: Move towards pointer
        item.wrapper.style.transition = "transform 0.75s ease-out";
        item.wrapper.style.transform = `translate(${item.moveX}px, ${item.moveY}px)`;

        // Phase 2: Wait 1.5s, then move back to center
        setTimeout(() => {
            item.wrapper.style.transition = "transform 2s ease-in-out";
            item.wrapper.style.transform = `translate(0px, 0px)`;
        }, 1500);
    });
}
let reportWindowOpen = false;
async function openReportWindow(){
    if(reportWindowOpen){
        document.getElementById("report-window").style.display = "none";
        reportWindowOpen = false;
        return;
    }
    document.getElementById("report-window").style.display = "block";
    reportWindowOpen = true;
    
}
<html>
    <div id="report-window" class="report-window">
      <div id="report-window-header" class="report-window-header"><img src="https://cdn-icons-png.flaticon.com/128/9068/9068699.png" onclick="closeReportWindow()">
      </div>
      <div class="container">
        <div class="eye-wrapper">
            <div class="eye-ball"></div>
        </div>
      </div>

      <div class="report-window-text">
      <p id="reporttext001" class="report-window-text001"></p>
      <p id="reporttext002" class="report-window-text002"></p>
      <p id="reporttext003" class="report-window-text001"></p>
      </div>   
    </div>
</html>

function closeReportWindow(){
    document.getElementById("report-window").style.display = "none";
    reportWindowOpen = false;
}


dragElement(document.getElementById("report-window"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "-header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Start the loop
// Initial call to start immediately? Or wait 4s?
// User said: "loop"
// prompt says "muts blink every 4 secs ... eyes will go ... loop"
// User implies concurrent loops or synchronized?
// "eyes will go towards the pointer [takes 1.5s] ... go back [takes 2s] then loop"
// Total movement cycle = 1.5s + 2s = 3.5s.
// Plus maybe a pause? User didn't specify pause, just "then loop".
// If I use 4000ms interval, there is a 0.5s pause.
// Prompt for blink is "every 4 secs".
// Movement and blink don't have to be perfectly synced, but let's stick to the user's snippet logic of 4000ms loop for movement too.

setInterval(moveEyes, 4000);
