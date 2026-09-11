import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(SplitText, Draggable);


class MusicPlayer {
  constructor() {
    this.currentTrackIndex = 0;
    this.audio = new Audio();
    this.isPlaying = false;
    this.volume = 1.2;
    this.init();
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadTrack();
    this.handleSplitTrack();
    this.setupDraggable();
    this.initRippleEffect();
    this.initSeekBar();
  }

  cacheDOM() {
    this.playButton = document.querySelector("#play");
    this.nextButton = document.querySelector("#next");
    this.prevButton = document.querySelector("#prev");
    this.trackTitle = document.querySelector("#track-title");
    this.fogGlow = document.querySelector("#fogGlow");
    this.miniWave = document.querySelector("#miniWave");
    this.seekBar = document.querySelector("#seekBar");
    this.seekFill = document.querySelector("#seekFill");
    this.seekThumb = document.querySelector("#seekThumb");

    // Build tracks directly from the covers in the DOM — single source of truth.
    // To add/remove/reorder songs later, just edit the <img data-title data-audio>
    // tags in index.html — this list updates itself automatically.
    const imgs = document.querySelectorAll(".icon-cards__item img");
    this.tracks = Array.from(imgs).map((img, i) => ({
      id: i + 1,
      title: img.dataset.title,
      url: img.dataset.audio
    }));
  }

  bindEvents(item) {
    this.playButton.addEventListener("click", () => this.togglePlay());
    this.nextButton.addEventListener("click", () => this.nextTrack());
    this.prevButton.addEventListener("click", () => this.prevTrack());
    this.audio.addEventListener("ended", () => this.nextTrack());
    this.animationToggle = document.querySelector("#toggle-animation");
  }

  loadTrack() {
    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.tracks.length) {
      console.error("Index de piste invalide");
      return;
    }

    // Clean up the previous split BEFORE touching textContent
    if (this.charSplit) this.charSplit.revert();
    if (this.lineSplit) this.lineSplit.revert();

    this.audio.src = this.tracks[this.currentTrackIndex].url;
    this.trackTitle.textContent = this.tracks[this.currentTrackIndex].title;
    this.updateGlowColor();
    this.updateActiveCardVisuals();

    if (this.seekFill && this.seekThumb) {
      this.seekFill.style.width = "0%";
      this.seekThumb.style.left = "0%";
    }
  }

  updateGlowColor() {
    const imgs = document.querySelectorAll(".icon-cards__item img");
    const img = imgs[this.currentTrackIndex];
    if (!img || !this.fogGlow) return;

    const sample = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 10;
      const ctx = canvas.getContext("2d");
      try {
        ctx.drawImage(img, 0, 0, 10, 10);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        this.fogGlow.style.setProperty("--glow-color", `rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        console.warn("Impossible de lire la couleur de l'image :", e);
      }
    };

    if (img.complete) sample();
    else img.addEventListener("load", sample, { once: true });
  }

  // Pops the currently playing card forward and pushes the rest back
  // (scaled down + slightly faded) while playing. Resets everyone to
  // normal when paused. Called on every track change and play/pause toggle.
  updateActiveCardVisuals() {
    const items = document.querySelectorAll(".icon-cards__item");
    items.forEach((item, i) => {
      const isCurrent = i === this.currentTrackIndex;

      const scale = this.isPlaying ? (isCurrent ? 1.15 : 0.85) : 1;
      const opacity = this.isPlaying ? (isCurrent ? 1 : 0.7) : 1;

      item.style.setProperty("--card-scale", scale);
      item.style.opacity = opacity;
    });
  }

  // Toggles the play/pause SVG icons via visibility instead of innerHTML,
  // so the button's internal structure (.btn-fill, both icons) is never
  // destroyed/rebuilt — keeps the ripple and active-state styling consistent
  // across every play/pause/next/prev action.
  updatePlayIcon() {
    const playIcon = this.playButton.querySelector(".icon-play");
    const pauseIcon = this.playButton.querySelector(".icon-pause");
    if (!playIcon || !pauseIcon) return;

    playIcon.style.display = this.isPlaying ? "none" : "block";
    pauseIcon.style.display = this.isPlaying ? "block" : "none";
  }

  handleSplitTrack() {
    this.lineSplit = new SplitText('#track-title', { types: 'lines', linesClass: 'split-parent' });
    this.charSplit = new SplitText('#track-title', { types: 'chars', tagName: 'span' });

    gsap.from(this.charSplit.chars, {
      y: '110%',
      opacity: 0,
      rotationZ: 10,
      duration: 0.4,
      ease: 'power2.out',
      stagger: {
        each: 0.015,
        from: 'start'
      }
    });
  }

  togglePlay() {
    this.playButton.classList.remove("jelly");
    void this.playButton.offsetWidth;
    this.playButton.classList.add("jelly");

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;

      this.playButton.classList.remove("active");
      this.fogGlow.classList.remove("active");
      this.miniWave.classList.remove("active")
      this.updateActiveCardVisuals();
      this.updatePlayIcon();

    } else {
      this.audio.play()
        .then(() => {
          this.isPlaying = true;

          this.playButton.classList.add("active");
          this.fogGlow.classList.add("active");
          this.miniWave.classList.add("active");
          this.updateActiveCardVisuals();
          this.updatePlayIcon();
        })
        .catch(err => console.error("Erreur de lecture :", err));
    }
  }

  nextTrack() {
    this.currentTrackIndex =
      (this.currentTrackIndex + 1) % this.tracks.length;

    this.loadTrack();

    if (this.isPlaying) {
      this.audio.play();
    }

    this.playButton.classList.toggle("active", this.isPlaying);
    this.updatePlayIcon();

    this.changerTrack();
  }

  prevTrack() {
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;

    this.loadTrack();

    if (this.isPlaying) {
      this.audio.play();
    }

    this.playButton.classList.toggle("active", this.isPlaying);
    this.updatePlayIcon();

    this.changerTrack();
  }

  setupDraggable() {
    var proxy = document.createElement("div");

    this.drag = Draggable.create(proxy, {
      trigger: ".icon-cards__content",
      x: this.currentTrackIndex,
      onDrag: this.updateSlider,
      onDragEnd: this.snapSlider.bind(this)
    });
  }

  updateSlider() {
    gsap.set(".icon-cards__content", {
      rotateY: this.x / 10
    })
  }

  snapSlider() {
    const isPositive = this.drag[0].startX - this.drag[0].x > 0;
    if (isPositive) {
      this.prevTrack()
    } else {
      this.nextTrack()
    }
  }

  changerTrack() {
    this.pas = (360 / this.tracks.length);
    const currentPas = this.pas * this.currentTrackIndex;

    gsap.to(".icon-cards__content", {
      transform: `translateZ(-30vw) rotateY(${-currentPas}deg)`,
      duration: 1
    })

    this.handleSplitTrack();
  }

  initRippleEffect() {
    document.querySelectorAll(".btn-player").forEach(btn => {
      const fill = btn.querySelector(".btn-fill");
      if (!fill) return;

      btn.addEventListener("click", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        fill.style.transition = "none";
        fill.style.top = `${y}px`;
        fill.style.left = `${x}px`;
        fill.style.transform = "translate(-50%, -50%) scale(0)";
        fill.style.opacity = "1";

        void fill.offsetWidth;

        fill.style.transition = "transform 0.6s ease, opacity 0.4s ease";
        fill.style.transform = "translate(-50%, -50%) scale(1)";

        setTimeout(() => {
          fill.style.top = "";
          fill.style.left = "";
          fill.style.transform = "";
          fill.style.opacity = "";
          fill.style.transition = "";
        }, 600);
      });
    });
  }

  updateSeekBar() {
    if (!this.audio.duration) return;
    const percent = (this.audio.currentTime / this.audio.duration) * 100;
    this.seekFill.style.width = `${percent}%`;
    this.seekThumb.style.left = `${percent}%`;
  }

  initSeekBar() {
    let isDragging = false;

    const seekToEvent = (e) => {
      const rect = this.seekBar.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let percent = (clientX - rect.left) / rect.width;
      percent = Math.min(1, Math.max(0, percent));

      if (this.audio.duration) {
        this.audio.currentTime = percent * this.audio.duration;
      }
      this.seekFill.style.width = `${percent * 100}%`;
      this.seekThumb.style.left = `${percent * 100}%`;
    };

    this.seekBar.addEventListener("mousedown", (e) => {
      isDragging = true;
      seekToEvent(e);
    });

    window.addEventListener("mousemove", (e) => {
      if (isDragging) seekToEvent(e);
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    this.seekBar.addEventListener("touchstart", (e) => {
      isDragging = true;
      seekToEvent(e);
    });

    window.addEventListener("touchmove", (e) => {
      if (isDragging) seekToEvent(e);
    });

    window.addEventListener("touchend", () => {
      isDragging = false;
    });

    this.audio.addEventListener("timeupdate", () => this.updateSeekBar());
  }
}

new MusicPlayer();