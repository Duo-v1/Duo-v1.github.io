(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const data = window.DUO;
  const lang = 'en';
  let demoIndex = 0;
  let demos = data.realtimeDemos;
  let conversationFilter = 'all';
  let mediaObserver = null;
  const heroMobile = window.matchMedia('(max-width: 600px)');
  const saveData = navigator.connection?.saveData;
  const demoVideo = $('#demo-video');
  const demoLanguage = $('#demo-language');
  const heroVideo = $('#hero-video');
  const t = (key) => data.translations[lang][key];
  const demoAsset = (demo,path) => demo.mediaVersion ? `${path}?v=${encodeURIComponent(demo.mediaVersion)}` : path;
  const time = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
  const header = $('.site-header');
  const navigation = $('#primary-navigation');
  const navToggle = $('.nav-toggle');
  const researchVersions = $('#research-versions');
  const researchToggle = researchVersions.querySelector('summary');
  const compactNavigation = window.matchMedia('(max-width: 1000px)');
  function setMenuOpen(open, returnFocus = false) {
    if (!open) researchVersions.open = false;
    navigation.classList.toggle('is-open',open);
    navToggle.setAttribute('aria-expanded',String(open));
    navToggle.querySelector('span').textContent = t(open ? 'closeMenu' : 'menu');
    if (returnFocus) navToggle.focus();
  }
  header.classList.add('nav-ready');
  navToggle.addEventListener('click',() => setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click',event => {if (event.target.closest('a')) setMenuOpen(false);});
  document.addEventListener('keydown',event => {
    if (event.key !== 'Escape') return;
    if (researchVersions.open) {
      event.preventDefault();
      researchVersions.open = false;
      researchToggle.focus();
    } else if (navToggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();setMenuOpen(false,true);
    }
  });
  document.addEventListener('pointerdown',event => {
    if (!header.contains(event.target)) setMenuOpen(false);
    else if (!researchVersions.contains(event.target)) researchVersions.open = false;
  });
  researchVersions.addEventListener('focusout',event => {
    if (!researchVersions.contains(event.relatedTarget)) researchVersions.open = false;
  });
  header.addEventListener('focusout',event => {if (!header.contains(event.relatedTarget)) setMenuOpen(false);});
  compactNavigation.addEventListener('change',() => {
    const focused = document.activeElement;
    const focusMoves = compactNavigation.matches ? navigation.contains(focused) : focused === navToggle;
    const versionFocusMoves = !compactNavigation.matches && researchVersions.open && researchVersions.contains(focused);
    setMenuOpen(false);
    if (focusMoves) (compactNavigation.matches ? navToggle : navigation.querySelector('a')).focus();
    else if (versionFocusMoves) researchToggle.focus();
  });
  function updateTheme() {
    document.documentElement.dataset.theme = 'dark';
    $('meta[name="theme-color"]').content = '#080b0f';
  }

  function renderDemo(changeMedia = false) {
    const demo = demos[demoIndex];
    const copy = demo[lang];
    demoLanguage.hidden = !demo.language;
    if (demo.language) setLanguageMark(demoLanguage, demo.language);
    // Use the known source shape immediately, then refine it from video metadata.
    $('#demo-panel').style.setProperty('--demo-ratio',String(demo.width && demo.height ? demo.width / demo.height : demo.id === '06' ? 360 / 624 : 540 / 720));
    $('#demo-tabs').replaceChildren(...demos.map((item,index) => {
      const tab = document.createElement('button');
      tab.className = 'demo-tab';
      tab.id = `demo-tab-${index}`;
      tab.type = 'button';
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected',String(index === demoIndex));
      tab.setAttribute('aria-controls','demo-panel');
      tab.tabIndex = index === demoIndex ? 0 : -1;
      const thumbnail = document.createElement('img');thumbnail.src = demoAsset(item,`assets/demo-${item.id}${item.thumbnailSuffix || ''}.jpg`);thumbnail.alt = '';thumbnail.width = 36;thumbnail.height = 44;
      const label = document.createElement('span');label.textContent = item[lang].tab;tab.append(thumbnail,label);
      tab.addEventListener('click',() => selectDemo(index));
      tab.addEventListener('keydown',(event) => handleTabKeys(event,index,demos.length,selectDemo));
      return tab;
    }));
    $('#demo-prev').disabled = demoIndex === 0;
    $('#demo-next').disabled = demoIndex === demos.length - 1;
    $('#demo-panel').setAttribute('aria-labelledby',`demo-tab-${demoIndex}`);
    $('#demo-title').textContent = copy.title;
    $('#demo-description').textContent = copy.description;
    demoVideo.setAttribute('aria-label',copy.title);
    const moments = $('#demo-moments');
    moments.parentElement.hidden = !demo.times?.length;
    moments.replaceChildren(...(demo.times || []).map((seconds,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'moment-button';
      button.setAttribute('aria-label',`${t('seek')} ${time(seconds)}: ${copy.moments[index]}`);
      const img = document.createElement('img');
      img.src = demoAsset(demo,`assets/demo-${demo.id}-moment-${index}.jpg`);
      img.alt = copy.moments[index];
      img.width = demo.width;img.height = demo.height;img.loading = 'lazy';
      const caption = document.createElement('span');caption.className = 'moment-caption';
      const stamp = document.createElement('time');stamp.textContent = time(seconds);
      const label = document.createElement('span');label.textContent = copy.moments[index];
      caption.append(stamp,label);button.append(img,caption);
      button.addEventListener('click',() => {
        pauseOtherVideos(demoVideo);
        const seek = () => {if (demos[demoIndex].id !== demo.id) return;demoVideo.scrollIntoView({block:'center',behavior:'instant'});demoVideo.currentTime = Math.min(seconds,Math.max(0,demoVideo.duration - .1));demoVideo.play().catch(() => announce(t('playError')));};
        if (demoVideo.readyState >= 1) seek(); else demoVideo.addEventListener('loadedmetadata',seek,{once:true});
      });
      return button;
    }));
    if (changeMedia) {
      demoVideo.pause();
      demoVideo.poster = demoAsset(demo,`assets/demo-${demo.id}.jpg`);
      demoVideo.src = demoAsset(demo,`media/demo-${demo.id}.mp4`);
      $('#demo-error').hidden = true;
      demoVideo.load();
    }
  }
  function selectDemo(index, focus = false) {
    if (!demos[index]) return;
    const wasFocused = document.activeElement?.getAttribute('role') === 'tab';
    demoIndex = index;
    renderDemo(true);
    if (focus || wasFocused) $(`#demo-tab-${index}`).focus({preventScroll:true});
    const selectedTab = $(`#demo-tab-${index}`);
    const tabs = $('#demo-tabs');
    if (tabs.scrollWidth > tabs.clientWidth) {
      const row = tabs.getBoundingClientRect();
      const tab = selectedTab.getBoundingClientRect();
      if (tab.left < row.left) tabs.scrollLeft += tab.left - row.left;
      else if (tab.right > row.right) tabs.scrollLeft += tab.right - row.right;
    }
    announce(`${t('selected')} ${demos[index][lang].tab}`);
  }
  function handleTabKeys(event,index,length,select) {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + length) % length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = length - 1;
    else return;
    event.preventDefault();select(next,true);
  }

  const momentDialog = $('#moment-dialog');
  const momentWatermark = momentDialog.querySelector('.moment-watermark');
  const momentPlayer = $('#moment-player');
  const momentPrev = $('#moment-prev');
  const momentNext = $('#moment-next');
  const momentToggle = $('#moment-toggle');
  const momentPlayerError = $('#moment-player-error');
  const momentPoster = item => `assets/conversation-${item.id}.jpg`;
  const momentSource = item => `media/conversation-${item.id}.mp4`;
  let momentItems = [];
  let momentIndex = 0;

  function setLanguageMark(mark, language) {
    mark.lang = language;
    mark.textContent = language === 'zh' ? '中文' : 'EN';
  }

  function neighborIndex(direction) {
    return (momentIndex + direction + momentItems.length) % momentItems.length;
  }

  function playMoment(index) {
    momentIndex = index;
    const item = momentItems[index];
    setLanguageMark(momentWatermark, item.language);
    $('#moment-dialog-title').textContent = item[lang].title;
    $('#moment-dialog-description').textContent = item[lang].description;
    $('#moment-dialog-position').textContent = `${index + 1} / ${momentItems.length}`;
    momentPlayer.style.setProperty('--moment-ratio', `${item.width} / ${item.height}`);
    [[momentPrev, -1, 'prevMoment'], [momentNext, 1, 'nextMoment']].forEach(([button, direction, label]) => {
      button.hidden = momentItems.length < 2;
      if (button.hidden) return;
      const neighbor = momentItems[neighborIndex(direction)];
      button.querySelector('img').src = momentPoster(neighbor);
      button.setAttribute('aria-label', `${t(label)}: ${neighbor[lang].title}`);
    });
    momentPlayerError.hidden = true;
    $('#moment-player-link').href = momentSource(item);
    momentPlayer.poster = momentPoster(item);
    momentPlayer.src = momentSource(item);
    momentPlayer.play().catch(() => {});
  }

  momentPrev.addEventListener('click', () => playMoment(neighborIndex(-1)));
  momentNext.addEventListener('click', () => playMoment(neighborIndex(1)));
  momentToggle.addEventListener('click', () => {
    if (momentPlayer.paused) momentPlayer.play().catch(() => {});
    else momentPlayer.pause();
  });
  for (const event of ['play', 'pause', 'ended']) {
    momentPlayer.addEventListener(event, () => updatePlayLabel(momentPlayer, momentToggle));
  }
  $('#moment-close').addEventListener('click', () => momentDialog.close());
  momentDialog.addEventListener('keydown', event => {
    if (momentItems.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    playMoment(neighborIndex(event.key === 'ArrowLeft' ? -1 : 1));
  });
  momentDialog.addEventListener('click', event => {
    if (event.target === momentDialog) momentDialog.close();
  });
  momentDialog.addEventListener('close', () => {
    if (momentDialog.open) return;
    momentPlayer.pause();
    momentPlayer.removeAttribute('src');
    momentPlayer.load();
  });
  momentPlayer.addEventListener('error', () => {momentPlayerError.hidden = false;});

  function renderConversations() {
    const categories = data.conversationCategories;
    const visible = data.conversations.filter(item => conversationFilter === 'all' || item.category === conversationFilter);
    $$('#conversation-grid video').forEach(video => {video.pause();mediaObserver?.unobserve(video);});
    $('#conversation-grid').classList.toggle('is-short',visible.length <= 2);
    $('#conversation-count').textContent = t(visible.length === 1 ? 'momentCount' : 'momentsCount').replace('{count}', visible.length);
    $('#conversation-grid').replaceChildren(...visible.map((item,index) => {
      const card = document.createElement('article');card.className = 'conversation-card';
      const titleId = `conversation-title-${item.id}`;
      card.setAttribute('aria-labelledby',titleId);
      const imageWrap = document.createElement('button');
      imageWrap.className = 'conversation-image';
      imageWrap.type = 'button';
      imageWrap.setAttribute('aria-label',t('playMoment').replace('{title}', item[lang].title));
      imageWrap.setAttribute('aria-haspopup','dialog');
      const poster = document.createElement('img');
      poster.src = momentPoster(item);
      poster.alt = '';
      poster.width = item.width;
      poster.height = item.height;
      poster.loading = 'lazy';
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden','true');
      video.addEventListener('playing', () => imageWrap.classList.toggle('is-previewing', !video.paused));
      video.addEventListener('pause', () => imageWrap.classList.remove('is-previewing'));
      imageWrap.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse' || momentDialog.open || saveData) return;
        if (!video.hasAttribute('src')) video.src = momentSource(item);
        if (video.readyState >= 1) video.currentTime = 0;
        video.play().catch(() => {});
      });
      imageWrap.addEventListener('pointerleave', () => video.pause());
      imageWrap.addEventListener('click', () => {
        video.pause();
        imageWrap.focus({preventScroll:true});
        momentItems = visible;
        momentDialog.showModal();
        playMoment(index);
      });
      const languageMark = momentWatermark.cloneNode(false);
      setLanguageMark(languageMark, item.language);
      imageWrap.append(poster,video,languageMark);
      const caption = document.createElement('div');caption.className = 'conversation-caption';
      const meta = document.createElement('div');meta.className = 'conversation-meta';
      const category = document.createElement('span');category.textContent = (categories.find(entry => entry.id === item.category) || categories[0]).label;
      meta.append(category);
      if (item.duration) {const duration = document.createElement('span');duration.textContent = time(item.duration);meta.append(duration);}
      const title = document.createElement('h3');title.id = titleId;title.textContent = item[lang].title;
      caption.append(meta,title);card.append(imageWrap,caption);
      mediaObserver?.observe(video);
      return card;
    }));
  }
  function renderConversationFilters() {
    const categories = [{id:'all'},...data.conversationCategories];
    $('#conversation-filters').replaceChildren(...categories.map(category => {
      const button = document.createElement('button');button.type = 'button';button.className = 'conversation-filter';button.textContent = category.id === 'all' ? t('allMoments') : category.label;
      button.dataset.filter = category.id;button.setAttribute('aria-pressed',String(conversationFilter === category.id));button.setAttribute('aria-controls','conversation-grid');
      button.addEventListener('click',() => {
        conversationFilter = category.id;
        $$('.conversation-filter').forEach(item => item.setAttribute('aria-pressed',String(item.dataset.filter === conversationFilter)));
        renderConversations();
      });
      return button;
    }));
  }
  function applyContent() {
    $('meta[name="description"]').content = $('meta[property="og:description"]').content = t('pageDescription');
    $$('[data-i18n]').forEach(el => {el.textContent = t(el.dataset.i18n);});
    $$('[data-i18n-html]').forEach(el => {el.innerHTML = t(el.dataset.i18nHtml);});
    for (const attribute of ['aria-label', 'alt', 'title']) {
      const key = `data-i18n-${attribute}`;
      $$(`[${key}]`).forEach(el => el.setAttribute(attribute, t(el.getAttribute(key))));
    }
    $$('[data-resource]').forEach(link => {link.href = data.resources[link.dataset.resource];});
    navToggle.querySelector('span').textContent = t(navigation.classList.contains('is-open') ? 'closeMenu' : 'menu');
    updatePlayLabel(demoVideo, $('#demo-play-toggle'));
    updatePlayLabel(momentPlayer, momentToggle);
    $('#citation-status').textContent = '';
    announce('');
    updateTheme();renderDemo();renderConversationFilters();renderConversations();
  }
  function announce(message) {$('#announcer').textContent = message;}
  $('#copy-citation').addEventListener('click',async () => {
    const code = $('#citation-code');
    const status = $('#citation-status');
    try {
      await navigator.clipboard.writeText(code.textContent.trim());
      status.textContent = t('citationCopied');
    } catch {
      const range = document.createRange();range.selectNodeContents(code);
      const selection = window.getSelection();selection.removeAllRanges();selection.addRange(range);
      status.textContent = t('citationSelected');
    }
  });
  $('#citation-details').addEventListener('toggle',() => {if (!$('#citation-details').open) $('#citation-status').textContent = '';});
  function pauseOtherVideos(except) {$$('video').forEach(v => {if (v !== except) v.pause();});}
  function updatePlayLabel(video, toggle) {
    toggle.setAttribute('aria-label', t(video.paused || video.ended ? 'playVideo' : 'pauseVideo'));
  }
  function bindVideoToggle(video, toggle) {
    toggle.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => announce(t('playError')));
      else video.pause();
    });
    const updateToggle = () => {
      const playing = !video.paused && !video.ended;
      toggle.classList.toggle('is-playing', playing);
      updatePlayLabel(video, toggle);
    };
    for (const event of ['play', 'pause', 'ended', 'emptied']) video.addEventListener(event, updateToggle);
  }
  function bindVideoProgress(video, progress) {
    const player = progress.parentElement;
    let hideTimer;

    function showProgress() {
      clearTimeout(hideTimer);
      player.classList.remove('is-progress-hidden');
      if (video.paused || video.ended) return;
      hideTimer = setTimeout(() => player.classList.add('is-progress-hidden'), 2200);
    }

    function updateProgress() {
      progress.valueAsNumber = progress.disabled ? 0 : video.currentTime;
      const played = progress.disabled ? 0 : 100 * progress.valueAsNumber / Number(progress.max);
      progress.style.setProperty('--played', `${played}%`);
    }

    function updateDuration() {
      const duration = video.duration;
      const canSeek = !video.error && Number.isFinite(duration) && duration > 0;
      progress.max = canSeek ? duration : 0;
      progress.disabled = !canSeek;
      updateProgress();
    }

    for (const event of ['loadedmetadata', 'durationchange', 'emptied', 'error']) video.addEventListener(event, updateDuration);
    for (const event of ['play', 'pause', 'ended', 'emptied']) video.addEventListener(event, showProgress);
    video.addEventListener('timeupdate', updateProgress);
    player.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch') showProgress();
    });
    player.addEventListener('click', event => {
      if (event.pointerType !== 'touch' || !player.classList.contains('is-progress-hidden')) return;
      event.stopPropagation();
      showProgress();
    }, true);
    for (const event of ['focus', 'blur', 'change', 'pointerup']) progress.addEventListener(event, showProgress);
    progress.addEventListener('input', () => {
      video.currentTime = progress.valueAsNumber;
      updateProgress();
      showProgress();
    });
    updateDuration();
  }

  bindVideoToggle(demoVideo, $('#demo-play-toggle'));
  bindVideoProgress(demoVideo, $('#demo-progress'));
  demoVideo.addEventListener('error',() => {$('#demo-error').hidden = false;});
  demoVideo.addEventListener('loadedmetadata',() => {
    if (demoVideo.videoWidth && demoVideo.videoHeight) {
      $('#demo-panel').style.setProperty('--demo-ratio',String(demoVideo.videoWidth / demoVideo.videoHeight));
    }
  });
  $('#demo-prev').addEventListener('click', () => selectDemo(demoIndex - 1));
  $('#demo-next').addEventListener('click', () => selectDemo(demoIndex + 1));

  function syncHeroSource(load = false) {
    const source = heroVideo.querySelector('source');
    const small = heroMobile.matches;
    heroVideo.poster = small ? heroVideo.dataset.posterMobile : heroVideo.dataset.posterDesktop;
    const src = small ? source.dataset.srcMobile : source.dataset.src;
    if (load && source.getAttribute('src') !== src) {source.src = src;heroVideo.load();}
  }
  function loadHero() {syncHeroSource(true);}
  let heroInView = !('IntersectionObserver' in window);
  function playHero() {
    if (!heroInView || document.hidden || momentDialog.open) return;
    if ($$('video').some(video => video !== heroVideo && !video.closest('.conversation-image') && !video.paused && !video.ended)) return;
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    loadHero();
    heroVideo.play().catch(() => {});
  }
  syncHeroSource();
  heroMobile.addEventListener('change',() => {
    syncHeroSource(heroVideo.querySelector('source').hasAttribute('src'));
    playHero();
  });
  heroVideo.addEventListener('canplay', playHero);
  window.addEventListener('pageshow', playHero);
  window.addEventListener('focus', playHero);
  document.addEventListener('pointerdown', playHero, {passive:true});
  document.addEventListener('keydown', playHero);
  document.addEventListener('play',event => {
    if (event.target instanceof HTMLVideoElement && !event.target.closest('.conversation-image')) pauseOtherVideos(event.target);
  },true);

  if ('IntersectionObserver' in window) {
    mediaObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.target === heroVideo) heroInView = entry.isIntersecting;
      if (!entry.isIntersecting) entry.target.pause();
      else if (entry.target === heroVideo) playHero();
    }),{threshold:.25});
    $$('video:not(#moment-player)').forEach(video => mediaObserver.observe(video));
  }
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) $$('video').forEach(video => video.pause());
    else playHero();
  });
  if (!('IntersectionObserver' in window)) playHero();
  applyContent();

  const demoNavigation = $('.demo-navigation');
  const demoTabs = $('#demo-tabs');
  const demoSteps = $$('.demo-step');
  function updateDemoArrows() {
    const needsScroll = demoTabs.scrollWidth > demoNavigation.clientWidth;
    demoNavigation.classList.toggle('is-scrollable', needsScroll);
    demoSteps.forEach(button => {button.hidden = !needsScroll;});
  }
  updateDemoArrows();
  new ResizeObserver(updateDemoArrows).observe(demoNavigation);

  const experienceModes = $$('.experience-mode button');
  experienceModes.forEach(button => {
    button.addEventListener('click', () => {
      const selectedDemos = button.dataset.mode === 'realtime' ? data.realtimeDemos : data.demos;
      if (selectedDemos === demos) return;
      demos = selectedDemos;
      experienceModes.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      demoTabs.scrollLeft = 0;
      selectDemo(0);
      updateDemoArrows();
    });
  });
})();
