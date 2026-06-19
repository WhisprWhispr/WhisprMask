import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Utility: get true time
export async function getTrueTime() {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const data = await res.json();
    return new Date(data.utc_datetime).getTime();
  } catch (e) {
    try {
      const res2 = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC');
      const data2 = await res2.json();
      return new Date(data2.currentUtcOffset ? data2.dateTime : Date.now()).getTime();
    } catch (e2) {
      return Date.now();
    }
  }
}

// Utility: get highest trial tier
export async function getHighestTrial(username) {
  if (!username) return 'none';
  try {
    const userDoc = await getDoc(doc(db, "users", username));
    if (!userDoc.exists()) return 'none';
    const trials = userDoc.data().trials || {};
    const trueTime = await getTrueTime();
    
    let highest = 'none';
    let weight = 0; // basic=1, pro=2, ult=3
    
    const checkTier = (tier, tierWeight) => {
      if (trials[tier]) {
        const end = trials[tier].startedAt + (trials[tier].durationDays * 24 * 60 * 60 * 1000);
        if (end > trueTime && tierWeight > weight) {
          highest = tier;
          weight = tierWeight;
        }
      }
    };
    
    checkTier('basic', 1);
    checkTier('pro', 2);
    checkTier('ult', 3);
    
    return highest;
  } catch(e) {
    console.error("Trial check error", e);
    return 'none';
  }
}



// --- FEATURE 8: Priority Support (Pro) ---
export function initSupport(tier) {
  if (tier !== 'pro' && tier !== 'ult') return;
  const fab = document.createElement('div');
  fab.innerHTML = '💬 VIP Support';
  Object.assign(fab.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    background: '#3b82f6', color: '#fff', padding: '15px 20px',
    borderRadius: '30px', cursor: 'pointer', zIndex: '9999',
    boxShadow: '0 5px 15px rgba(59,130,246,0.4)',
    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
  });
  fab.onclick = () => {
    fab.innerHTML = 'Connecting...';
    setTimeout(() => {
      alert("VIP Support Agent (Sarah): Hi! How can I help you today?");
      fab.innerHTML = '💬 VIP Support';
    }, 1500);
  };
  document.body.appendChild(fab);
}

// --- FEATURE 10: Visitor Tracking (Pro) ---
export async function trackVisitor(username) {
  try {
    const ref = doc(db, "users", username);
    const snap = await getDoc(ref);
    if(snap.exists()) {
      let views = snap.data().views || 0;
      await setDoc(ref, { views: views + 1 }, { merge: true });
    }
  } catch(e) {}
}

// --- FEATURE 15: Sultan 3D Effect (Ult) ---
export function initSultanEffect() {
  const container = document.querySelector('.container');
  if(!container) return;
  container.style.transition = 'transform 0.1s ease';
  container.style.boxShadow = '0 0 30px rgba(234, 179, 8, 0.5)';
  container.style.border = '2px solid #eab308';
  
  document.addEventListener('mousemove', (e) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    container.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
  });
  
  // Create particle canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0'; canvas.style.left = '0';
  canvas.style.width = '100vw'; canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-1';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.addEventListener('resize', resize);
  resize();

  const particles = Array.from({length: 30}).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3 + 1,
    speedY: Math.random() * -1 - 0.5
  }));
  
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.y += p.speedY;
      if(p.y < 0) p.y = canvas.height;
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// --- FEATURE 7: Sender Hints (GeoIP) ---
export async function getSenderHints() {
  let location = "Unknown Location";
  let device = navigator.userAgent;
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if(data.city && data.country_name) {
      location = `${data.city}, ${data.country_name}`;
    }
  } catch(e) {}
  
  let deviceName = "Unknown Device";
  if(/android/i.test(device)) deviceName = "Android Device";
  if(/iPad|iPhone|iPod/.test(device)) deviceName = "iOS Device";
  if(/windows/i.test(device)) deviceName = "Windows PC";
  if(/mac/i.test(device)) deviceName = "Mac";
  
  return { location, device: deviceName };
}

// Global initialization
window.initPremiumFeatures = async () => {
  const isSendPage = window.location.pathname.includes('send.html');
  const isInboxPage = window.location.pathname.includes('inbox.html');
  const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
  const isSettingsPage = window.location.pathname.includes('settings.html');
  
  // --- FEATURE 1: Custom Profile URL Intercept ---
  if (isSendPage) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('c') && !params.has('u')) {
      const handle = params.get('c');
      const handleDoc = await getDoc(doc(db, "handles", handle));
      if (handleDoc.exists()) {
        window.location.replace(`send.html?u=${handleDoc.data().username}`);
        return; // Stop execution, redirecting
      }
    }
  }

  // Identify context user
  let contextUser = null;
  if(isSendPage) {
    const params = new URLSearchParams(window.location.search);
    contextUser = params.get('u');
  } else {
    contextUser = localStorage.getItem('ngl_username');
  }
  
  if(!contextUser) return;
  
  const tier = await getHighestTrial(contextUser);
  const userDoc = await getDoc(doc(db, "users", contextUser));
  const userData = userDoc.data() || {};
  
  // Bind global tier check for inline scripts
  window.currentUserTier = tier;
  window.currentUserData = userData;

  // Feature 2: Ads removed
  
  // --- Feature 3 & 4: Custom Background & Font ---
  if (tier !== 'none') {
    if (userData.customColor) {
      document.body.style.background = userData.customColor;
      document.body.dataset.theme = 'custom'; // Override theme
    }
    if (userData.customFont) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${userData.customFont.replace(' ', '+')}&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
      document.body.style.fontFamily = `'${userData.customFont}', sans-serif`;
    }
  }
  
  // --- SEND PAGE LOGIC ---
  if (isSendPage) {
    if (tier === 'pro' || tier === 'ult') trackVisitor(contextUser);
    if (tier === 'ult') {
      initSultanEffect();
      // Feature 14: Sultan Badge
      setTimeout(() => {
        const title = document.querySelector('h2[data-i18n="send.title"]');
        if (title && title.nextElementSibling) {
          title.nextElementSibling.innerHTML += ` <span title="Verified Sultan" style="color:#eab308; font-size: 1.2rem;">👑✅</span>`;
        }
      }, 500);
    }
  }
  
  // --- SETTINGS PAGE LOGIC ---
  if (isSettingsPage) {
    if (tier !== 'none') {
      document.getElementById('premium-settings-panel').style.display = 'block';
      
      const handleInput = document.getElementById('premium-handle');
      if (userData.customHandle) handleInput.value = userData.customHandle;
      
      document.getElementById('save-handle-btn').onclick = async () => {
        const h = handleInput.value.trim();
        if(!h) return;
        await setDoc(doc(db, "handles", h), { username: contextUser });
        await setDoc(doc(db, "users", contextUser), { customHandle: h }, { merge: true });
        alert(`Handle saved! Your new link: ${window.location.origin}/send.html?c=${h}`);
      };

      document.getElementById('save-color-btn').onclick = async () => {
        const c = document.getElementById('premium-color').value;
        await setDoc(doc(db, "users", contextUser), { customColor: c }, { merge: true });
        document.body.style.background = c;
        document.body.dataset.theme = 'custom';
        alert('Color saved! Open your link to see it.');
      };

      document.getElementById('save-font-btn').onclick = async () => {
        const f = document.getElementById('premium-font').value;
        await setDoc(doc(db, "users", contextUser), { customFont: f }, { merge: true });
        if (f) {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${f.replace(' ', '+')}&display=swap`;
          link.rel = "stylesheet";
          document.head.appendChild(link);
          document.body.style.fontFamily = `'${f}', sans-serif`;
        }
        alert('Font saved! Open your link to see it.');
      };

      if (tier === 'pro' || tier === 'ult') {
        const waBtn = document.getElementById('toggle-wa-btn');
        if(userData.waActive) waBtn.textContent = 'WhatsApp: ACTIVE';
        waBtn.onclick = async () => {
          const newState = !userData.waActive;
          await setDoc(doc(db, "users", contextUser), { waActive: newState }, { merge: true });
          alert('WhatsApp API Simulated Connect ' + (newState ? 'ON' : 'OFF'));
          window.location.reload();
        };
      }

      if (tier === 'ult') {
        const aiBtn = document.getElementById('toggle-ai-btn');
        if(userData.aiActive) aiBtn.textContent = 'AI Bot: ACTIVE';
        aiBtn.onclick = async () => {
          const newState = !userData.aiActive;
          await setDoc(doc(db, "users", contextUser), { aiActive: newState }, { merge: true });
          alert('Smart AI Auto-Reply ' + (newState ? 'ON' : 'OFF'));
          window.location.reload();
        };
      }
    }
  }

  // --- INBOX PAGE LOGIC ---
  if (isInboxPage) {
    initSupport(tier);
    
    // Feature 1: Update copied link if handle exists
    if(userData.customHandle) {
      setTimeout(() => {
         const linkText = document.getElementById('share-link');
         if(linkText) linkText.value = window.location.origin + '/send.html?c=' + userData.customHandle;
      }, 500);
    }

    if (tier === 'pro' || tier === 'ult') {
       // Feature 10: Display visitor stats
       if(userData.views) {
         const statsDiv = document.createElement('div');
         statsDiv.style.background = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
         statsDiv.style.color = '#fff';
         statsDiv.style.padding = '15px';
         statsDiv.style.borderRadius = '15px';
         statsDiv.style.marginBottom = '20px';
         statsDiv.style.textAlign = 'center';
         statsDiv.innerHTML = `<h3>🔥 Profile Views: ${userData.views}</h3>`;
         const container = document.querySelector('.container');
         container.insertBefore(statsDiv, container.children[1]);
       }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.initPremiumFeatures();
});
