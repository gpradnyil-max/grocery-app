/**
 * Confetti Animation Library
 * Fun party popper effects for celebrations!
 */

class ConfettiCannon {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  // Create a single confetti particle
  createParticle(x, y, options = {}) {
    const colors = options.colors || [
      '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
      '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'
    ];
    
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * (options.spread || 15),
      vy: -(Math.random() * (options.velocity || 15) + 5),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: options.gravity || 0.3,
      drag: options.drag || 0.99,
      life: 1,
      decay: options.decay || 0.01,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    };
  }
  
  // Fire confetti from a point
  fire(x, y, count = 50, options = {}) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y, options));
    }
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  // Fire confetti from both sides (celebration)
  celebrate(count = 100) {
    const leftX = 0;
    const rightX = this.canvas.width;
    const y = this.canvas.height * 0.7;
    
    // Left cannon
    for (let i = 0; i < count / 2; i++) {
      const particle = this.createParticle(leftX, y, {
        spread: 10,
        velocity: 18
      });
      particle.vx = Math.abs(particle.vx) + 5; // Force right direction
      this.particles.push(particle);
    }
    
    // Right cannon
    for (let i = 0; i < count / 2; i++) {
      const particle = this.createParticle(rightX, y, {
        spread: 10,
        velocity: 18
      });
      particle.vx = -Math.abs(particle.vx) - 5; // Force left direction
      this.particles.push(particle);
    }
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  // Burst confetti from center
  burst(x, y, count = 80) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = Math.random() * 10 + 8;
      const particle = this.createParticle(x, y);
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      this.particles.push(particle);
    }
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  // Rain confetti from top
  rain(count = 100, duration = 3000) {
    const interval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        const x = Math.random() * this.canvas.width;
        const particle = this.createParticle(x, -20, {
          velocity: 2,
          gravity: 0.2
        });
        particle.vy = Math.abs(particle.vy);
        this.particles.push(particle);
      }
    }, 50);
    
    setTimeout(() => clearInterval(interval), duration);
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  // Animate particles
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update physics
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;
      
      // Draw particle
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      
      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
      
      // Remove dead particles
      if (p.life <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }
    
    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }
}

// Emoji explosion effect
class EmojiExplosion {
  constructor() {
    this.emojis = [];
    this.animationId = null;
  }
  
  explode(x, y, emoji = '🎉', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = Math.random() * 6 + 4;
      
      const emojiEl = document.createElement('div');
      emojiEl.textContent = emoji;
      emojiEl.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: ${Math.random() * 20 + 20}px;
        pointer-events: none;
        z-index: 10000;
        transition: none;
      `;
      document.body.appendChild(emojiEl);
      
      this.emojis.push({
        el: emojiEl,
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 20,
        life: 1,
        decay: 0.02
      });
    }
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  animate() {
    for (let i = this.emojis.length - 1; i >= 0; i--) {
      const e = this.emojis[i];
      
      e.x += e.vx;
      e.y += e.vy;
      e.vy += 0.3; // gravity
      e.rotation += e.rotationSpeed;
      e.life -= e.decay;
      
      e.el.style.left = `${e.x}px`;
      e.el.style.top = `${e.y}px`;
      e.el.style.transform = `rotate(${e.rotation}deg)`;
      e.el.style.opacity = e.life;
      
      if (e.life <= 0) {
        e.el.remove();
        this.emojis.splice(i, 1);
      }
    }
    
    if (this.emojis.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }
}

// Initialize and export
const confetti = new ConfettiCannon();
const emojiExplosion = new EmojiExplosion();

// Helper functions
function fireConfetti(x, y, count = 50) {
  confetti.fire(x, y, count);
}

function celebrateConfetti() {
  confetti.celebrate(150);
}

function burstConfetti(x, y) {
  confetti.burst(x, y, 60);
}

function rainConfetti() {
  confetti.rain(100, 3000);
}

function explodeEmoji(x, y, emoji = '🎉') {
  emojiExplosion.explode(x, y, emoji, 10);
}

// Party function - combination of effects
function partyTime(x, y) {
  burstConfetti(x, y);
  explodeEmoji(x, y, '🎉');
  
  setTimeout(() => {
    explodeEmoji(x - 50, y - 20, '⭐');
    explodeEmoji(x + 50, y - 20, '✨');
  }, 200);
}

function megaCelebration() {
  celebrateConfetti();
  rainConfetti();
  
  const emojis = ['🎉', '🎊', '🌟', '⭐', '✨', '🥳'];
  let delay = 0;
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * (window.innerHeight / 2);
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      explodeEmoji(x, y, emoji);
    }, delay);
    delay += 300;
  }
}
