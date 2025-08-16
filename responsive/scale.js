(function(){
  // 安全外层缩放：仅对 .game-container 做 CSS transform，不改 canvas/逻辑尺寸
  const url = new URL(location.href);
  if ((url.searchParams.get('scale') || '').toLowerCase() === 'off') return;

  const MARGIN = 32;               // 视口边距
  const MIN_SCALE = 0.6;           // 最小缩放，避免过小
  const MAX_SCALE = 1.0;           // 不放大
  let baseW = 0, baseH = 0, wrapper, container;
  let resizeHandle = 0;

  function measureBase(){
    container = document.querySelector('.game-container');
    if (!container) return false;
    // 初始放置时移除可能存在的 transform 影响测量
    container.style.transform = 'none';
    container.style.transformOrigin = 'top center';
    // 创建包装器
    if (!wrapper){
      wrapper = document.createElement('div');
      wrapper.className = 'scale-wrapper';
      // 基础样式（避免依赖外部 CSS）
      wrapper.style.width = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'center';
      wrapper.style.alignItems = 'flex-start';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.paddingTop = '0px';
      // 注入到 DOM
      const parent = container.parentElement;
      parent.insertBefore(wrapper, container);
      wrapper.appendChild(container);
    }
    const rect = container.getBoundingClientRect();
    baseW = Math.round(rect.width);
    baseH = Math.round(rect.height);
    // 回退：若获取为0（尚未布局完成），延后再测
    if (!baseW || !baseH){
      requestAnimationFrame(measureBase);
      return false;
    }
    return true;
  }

  function applyScale(){
    if (!container || !wrapper || !baseW || !baseH) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        MAX_SCALE,
        Math.min((vw - MARGIN) / baseW, (vh - MARGIN) / baseH)
      )
    );
    // 设置容器缩放
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top center';
    // 包装器占位尺寸，防止布局坍塌
    wrapper.style.height = Math.round(baseH * scale) + 'px';
  }

  function schedule(){
    cancelAnimationFrame(resizeHandle);
    resizeHandle = requestAnimationFrame(applyScale);
  }

  function init(){
    if (!measureBase()) return; // 将在 rAF 重试
    applyScale();
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
