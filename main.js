/* =========================================================
   Emma WU Yi · 作品集 —— 纯原生 JS 交互
   只依赖浏览器原生 API，无任何框架 / 库 / 构建步骤
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initFadeCarousels() // 项目经历：peek 轮播（当前图居中，两侧露出前后张）
  // initSlideCarousels() // 视觉板块：横向滚动轮播
  initAccordions() // 文字作品：文件夹 / 论文折叠
  initMusicPlayer() // Muse AI 音乐播放器
  initPhotoWall() // 图片作品：照片墙滚动进场
})

/* ---------------------------------------------------------
   1. 项目卡片轮播（.carousel）—— peek 布局
   当前图在播放区正中居中，左右未填满处由前一张 / 后一张填补，
   图层从上到下与设计稿 7 层一一对应：
     ① 文字区 .workcard__body（在 styles.css，天然压在最上层）
     ② 左右按键 .carousel__nav          z-index: 6（位置在 styles.css 调）
     ③ 白色渐变过渡 .carousel__fade     z-index: 5（JS 注入）
     ④ 当前主图 img.is-current          z-index: 4
     ⑤ 主图阴影（box-shadow，投在⑥⑦层图片上）
     ⑥ 下一张 img.is-next               z-index: 3
     ⑦ 前一张 img.is-prev               z-index: 2
   无缝循环：首尾各克隆一张，滚过克隆页后关掉动画瞬间归位
   --------------------------------------------------------- */
function initFadeCarousels() {
  document.querySelectorAll('.carousel').forEach((root) => {
    const originals = Array.from(root.querySelectorAll(':scope > img'))
    const dots = Array.from(root.querySelectorAll('.carousel__dots button'))
    const n = originals.length
    if (n === 0) return

    const GAP = 16 // 图与图的间距（px）
    const DUR = 720 // 滑动时长，与 styles.css 里 transition 的 0.72s 保持一致

    // 首尾各克隆一张，实现「最后一张 → 第一张」的无缝衔接
    const headClone = originals[0].cloneNode(true)
    const tailClone = originals[n - 1].cloneNode(true)
    headClone.className = ''
    tailClone.className = ''
    root.insertBefore(tailClone, root.firstChild)
    root.appendChild(headClone)
    const slides = [tailClone, ...originals, headClone]

    // 第③层：白色渐变过渡，盖在图片之上、按键之下
    const fade = document.createElement('div')
    fade.className = 'carousel__fade'
    root.appendChild(fade)

    let pos = 1 // 1..n 对应真实图；0 / n+1 是克隆页
    let snapTimer = null
    let timer = null

    const ratioOf = (img) =>
      img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 16 / 9

    /* ★ 图片显示位置调整：layout() 负责算出每张图的 translateX */
    const layout = (animate = true) => {
      const V = root.clientWidth // ★ 视窗（播放区）宽度：.carousel 的实际宽度，由 styles.css 中 .workcard 的 grid-template-columns 左列决定
      const H = root.clientHeight // 视窗高度 = 卡片高度；每张图宽度 = 高度 × 原图比例
      if (!V || !H) return
      const w = slides.map((im) => H * ratioOf(im))
      const x = new Array(slides.length)
      x[pos] = (V - w[pos]) / 2 // ★ 当前图居中：左边缘 = (视窗宽 − 图宽) ÷ 2
      for (let k = pos + 1; k < slides.length; k++) x[k] = x[k - 1] + w[k - 1] + GAP // 后一张依次向右排
      for (let k = pos - 1; k >= 0; k--) x[k] = x[k + 1] - w[k] - GAP // 前一张依次向左排
      slides.forEach((img, k) => {
        img.style.transition = animate ? '' : 'none'
        img.style.width = `${Math.round(w[k])}px`
        img.style.transform = `translateX(${Math.round(x[k])}px)`
        img.classList.toggle('is-current', k === pos)
        img.classList.toggle('is-next', k === pos + 1)
        img.classList.toggle('is-prev', k === pos - 1)
      })
      const cur = (((pos - 1) % n) + n) % n
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === cur))
    }

    // 关掉动画归位后，下一帧再把过渡打开
    const restoreTransition = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => slides.forEach((im) => { im.style.transition = '' }))
      )
    }

    // 若正停在克隆页上，关动画瞬间跳回真实图
    const snapIfClone = () => {
      if (pos === n + 1) { pos = 1; layout(false); restoreTransition() }
      else if (pos === 0) { pos = n; layout(false); restoreTransition() }
    }

    const go = (p) => {
      if (snapTimer) { clearTimeout(snapTimer); snapTimer = null; snapIfClone() }
      pos = Math.min(n + 1, Math.max(0, p))
      layout(true)
      snapTimer = setTimeout(() => { snapTimer = null; snapIfClone() }, DUR + 40)
    }
    const shift = (d) => go(pos + d) // d=+1 新图从右侧进入（从右到左）；d=-1 回到上一张

    const stop = () => { if (timer) clearInterval(timer); timer = null }
    const play = () => {
      if (n <= 1) return
      stop()
      timer = setInterval(() => shift(1), 4500)
    }

    // 第②层：按键事件（按键位置在 styles.css 的 .carousel__nav--prev / --next 调）
    const prevBtn = root.querySelector('.carousel__nav--prev')
    const nextBtn = root.querySelector('.carousel__nav--next')
    if (prevBtn) prevBtn.addEventListener('click', () => { shift(-1); play() })
    if (nextBtn) nextBtn.addEventListener('click', () => { shift(1); play() })
    dots.forEach((d, idx) =>
      d.addEventListener('click', () => { go(idx + 1); play() })
    )

    // 图片加载完成后才知道真实比例，加载完重新排版（不做动画）
    slides.forEach((im) => {
      if (!im.complete) im.addEventListener('load', () => layout(false), { once: true })
    })

    // 视窗尺寸变化后重新计算居中位置（拖动窗口不会跑偏）
    let rt = null
    window.addEventListener('resize', () => {
      if (rt) clearTimeout(rt)
      rt = setTimeout(() => layout(false), 120)
    })

    layout(false)
    play()
  })
}

/* ---------------------------------------------------------
   3. 折叠面板：文字作品的文件夹（.folder）与论文（.paper）
   --------------------------------------------------------- */
function initAccordions() {
  document.querySelectorAll('.folder__head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const folder = btn.closest('.folder')
      const open = folder.classList.toggle('open')
      btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  })

  document.querySelectorAll('.paper__row').forEach((btn) => {
    if (btn.tagName === 'A') return // 链接行（如毕业论文）：跳转新标签页，不做折叠
    btn.addEventListener('click', () => {
      const paper = btn.closest('.paper')
      const open = paper.classList.toggle('open')
      btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  })
}

/* ---------------------------------------------------------
   4. 音乐播放器（.music）
   把 mp3 放进 audio/ 文件夹即可播放；文件缺失时给出提示
   --------------------------------------------------------- */
function initMusicPlayer() {
  const music = document.querySelector('.music')
  if (!music) return

  const audio = music.querySelector('audio')
  const btn = music.querySelector('.music__play')
  const bar = music.querySelector('.music__bar span')
  const cover = music.querySelector('.music__cover')
  if (!audio || !btn) return

  let hint = music.querySelector('.music__hint')

  const showHint = (text) => {
    if (!hint) {
      hint = document.createElement('p')
      hint.className = 'music__hint'
      music.querySelector('.music__main').appendChild(hint)
    }
    hint.textContent = text
  }

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio
        .play()
        .then(() => {
          btn.classList.add('is-playing')
          btn.textContent = '❚❚'
          btn.setAttribute('aria-label', '暂停')
          if (hint) hint.remove()
          if (cover && !cover.querySelector('.music__spin')) {
            const spin = document.createElement('span')
            spin.className = 'music__spin'
            cover.appendChild(spin)
          }
        })
        .catch(() => {
          showHint(`音频文件待补充：把 mp3 放到 ${audio.getAttribute('src')}`)
        })
    } else {
      audio.pause()
      btn.classList.remove('is-playing')
      btn.textContent = '▶'
      btn.setAttribute('aria-label', '播放')
      const spin = cover && cover.querySelector('.music__spin')
      if (spin) spin.remove()
    }
  })

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || !bar) return
    bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`
  })
  audio.addEventListener('ended', () => {
    btn.classList.remove('is-playing')
    btn.textContent = '▶'
    if (bar) bar.style.width = '0%'
  })
  audio.addEventListener('error', () => {
    showHint(`音频文件待补充：把 mp3 放到 ${audio.getAttribute('src')}`)
  })
}

/* ---------------------------------------------------------
   5. 图片作品 · 照片墙滚动进场
   进入视口后加 .is-visible，配合 CSS 让照片依次"撒落"归位
   --------------------------------------------------------- */
function initPhotoWall() {
  const wall = document.querySelector('.photo-wall')
  if (!wall || !('IntersectionObserver' in window)) {
    if (wall) wall.classList.add('is-visible')
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  io.observe(wall)
}

