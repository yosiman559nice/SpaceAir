const refreshButton = document.querySelector('#refresh-btn');
const statusMessage = document.querySelector('#status');
const countDisplay = document.querySelector('#visit-count');
const subtext = document.querySelector('#subtext');
const starfield = document.querySelector('#starfield');
const glowRange = document.querySelector('#glow-range');
const summonComet = document.querySelector('#summon-comet');
const shootingStarsLayer = document.querySelector('#shooting-stars');
const cursorOrb = document.querySelector('#cursor-orb');
const mainPanel = document.querySelector('main');
const zdogCanvas = document.querySelector('#zdog-canvas');

const setStatus = (message) => {
  statusMessage.textContent = message;
};

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const buildStar = () => {
  const star = document.createElement('span');
  star.className = 'star';
  star.style.top = `${randomBetween(0, 100)}%`;
  star.style.left = `${randomBetween(0, 100)}%`;
  const scale = randomBetween(0.5, 1.8);
  star.style.transform = `scale(${scale})`;
  const delay = randomBetween(0, 4).toFixed(2);
  star.style.animationDelay = `${delay}s`;
  star.style.animationDuration = `${randomBetween(3, 6).toFixed(2)}s`;
  if (Math.random() > 0.75) {
    star.style.background = `rgba(255, ${Math.floor(
      randomBetween(180, 255)
    )}, ${Math.floor(randomBetween(120, 255))}, 0.9)`;
  }
  return star;
};

const renderStars = (count) => {
  starfield.replaceChildren();
  const totalStars = Math.max(count, 1);
  const capped = Math.min(totalStars, 400);
  for (let i = 0; i < capped; i += 1) {
    starfield.append(buildStar());
  }
};

let orbitIllustration;
let orbitDots = [];
let orbitTick = 0;

const initOrbitarium = () => {
  if (!window.Zdog || !zdogCanvas) {
    return;
  }
  const { Illustration, Ellipse, Shape } = window.Zdog;
  orbitIllustration = new Illustration({
    element: zdogCanvas,
    dragRotate: true,
    rotate: { x: -0.3, y: 0.4 }
  });

  new Ellipse({
    addTo: orbitIllustration,
    diameter: 160,
    stroke: 2,
    color: '#7dd3fc'
  });

  new Shape({
    addTo: orbitIllustration,
    stroke: 50,
    color: '#f472b6',
    translate: { z: -10 }
  });

  const dotCount = 12;
  orbitDots = Array.from({ length: dotCount }).map((_, index) => {
    const theta = (index / dotCount) * window.Zdog.TAU;
    return new Shape({
      addTo: orbitIllustration,
      stroke: 10,
      color: '#fef3c7',
      translate: {
        x: Math.cos(theta) * 80,
        y: Math.sin(theta) * 50,
        z: Math.sin(theta * 1.5) * 25
      }
    });
  });

  const animate = () => {
    orbitTick += 0.01;
    orbitIllustration.rotate.y += 0.003;
    orbitDots.forEach((dot, index) => {
      const baseAngle = (index / orbitDots.length) * window.Zdog.TAU + orbitTick;
      const radius = 70 + Math.sin(orbitTick * 2 + index) * 10;
      dot.translate.x = Math.cos(baseAngle) * radius;
      dot.translate.y = Math.sin(baseAngle) * 50;
      dot.translate.z = Math.sin(baseAngle * 1.5) * 25;
    });
    orbitIllustration.updateRenderGraph();
    requestAnimationFrame(animate);
  };

  animate();
};

const updateOrbitEnergy = (count) => {
  if (!orbitIllustration || !orbitDots.length) {
    return;
  }
  const normalized = Math.min(count, 200);
  orbitIllustration.rotate.x = -0.4 + normalized * 0.001;
  orbitDots.forEach((dot, index) => {
    dot.color =
      index % 2 === 0
        ? '#fef3c7'
        : normalized % 2 === 0
          ? '#a5b4fc'
          : '#f472b6';
  });
};

const recordVisit = async () => {
  try {
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown';
    await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone })
    });
  } catch (error) {
    console.error('Failed to register visit', error);
  }
};

const refreshPreview = async () => {
  refreshButton.disabled = true;
  setStatus('Crunching cosmic dust…');
  try {
    const response = await fetch('/api/visits/count');
    if (!response.ok) {
      throw new Error('Unable to read log');
    }
    const { count } = await response.json();
    renderStars(count);
    countDisplay.textContent = count.toLocaleString();
    updateOrbitEnergy(count);
    const stamp = new Date().toLocaleTimeString();
    if (count === 0) {
      subtext.textContent = 'Cosmos is quiet… leave the first luminous trace.';
    } else {
      const noun = count === 1 ? 'footprint' : 'footprints';
      subtext.textContent = `Starfield catalogued at ${stamp} – ${count} ${noun} shimmering.`;
    }
    setStatus('Constellation updated.');
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  } finally {
    refreshButton.disabled = false;
  }
};

window.addEventListener('load', async () => {
  await recordVisit();
  await refreshPreview();

  document.documentElement.style.setProperty('--star-glow', '0.85');
  initOrbitarium();
});

glowRange.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  const normalized = value / 100;
  const glowRadius = (normalized * 40 + 10).toFixed(1);
  document.documentElement.style.setProperty(
    '--star-opacity',
    (0.5 + normalized * 0.5).toString()
  );
  document.documentElement.style.setProperty('--glow-radius', `${glowRadius}px`);
  setStatus(`Nebula glow set to ${(normalized * 100).toFixed(0)}%`);
});

const launchComet = () => {
  const layerRect = shootingStarsLayer.getBoundingClientRect();
  const comet = document.createElement('span');
  comet.className = 'shooting-star';
  const top = randomBetween(20, layerRect.height - 40);
  const left = randomBetween(20, layerRect.width - 140);
  comet.style.top = `${top}px`;
  comet.style.left = `${left}px`;
  comet.style.transform = `rotate(${randomBetween(-30, 30)}deg)`;
  shootingStarsLayer.append(comet);
  setTimeout(() => comet.remove(), 1300);
};

summonComet.addEventListener('click', () => {
  launchComet();
  setStatus('Comet trail deployed ✨');
});

refreshButton.addEventListener('click', () => {
  refreshPreview();
  launchComet();
});

const updateTilt = (event) => {
  const rect = mainPanel.getBoundingClientRect();
  const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -6;
  const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
  mainPanel.style.setProperty('--tiltX', `${rotateY.toFixed(2)}deg`);
  mainPanel.style.setProperty('--tiltY', `${rotateX.toFixed(2)}deg`);
};

const updateCursorOrb = (event) => {
  const rect = mainPanel.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    cursorOrb.style.opacity = '0';
    return;
  }
  cursorOrb.style.opacity = '1';
  cursorOrb.style.transform = `translate(${x}px, ${y}px)`;
};

document.addEventListener('pointermove', (event) => {
  updateTilt(event);
  updateCursorOrb(event);
});

mainPanel.addEventListener('pointerleave', () => {
  cursorOrb.style.opacity = '0';
  mainPanel.style.setProperty('--tiltX', '0deg');
  mainPanel.style.setProperty('--tiltY', '0deg');
});

