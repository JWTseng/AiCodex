// 轻量延迟测试浮层：F9 切换显示，J/K 测试 move/rotate 音效
(function () {
	const audio = window.globalAudioManager;
	if (!audio) return;

	let container = null;
	let logEl = null;
	let summaryEl = null;
	let visible = false;

	let lastKeyPerf = 0;
	let lastRAF = 0;
	let sampleCount = 0;
	let accKeyToSFX = 0;
	let accKeyToRAF = 0;

	function ensureUI() {
		if (container) return;
		container = document.createElement('div');
		container.style.cssText = [
			'position:fixed', 'right:12px', 'bottom:12px', 'z-index:99999',
			'width:320px', 'max-height:50vh', 'overflow:auto',
			'background:#173a17', 'border:1px solid #305a30', 'border-radius:8px', 'box-shadow:0 4px 12px rgba(0,0,0,.3)',
			'font-family:-apple-system,BlinkMacSystemFont,Arial', 'color:#8bac0f'
		].join(';');

		const header = document.createElement('div');
		header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #305a30;color:#fff;font-weight:600;';
		header.textContent = '延迟测试 (F9 关闭)';
		container.appendChild(header);

		summaryEl = document.createElement('div');
		summaryEl.style.cssText = 'padding:8px 10px; font-size:13px;';
		summaryEl.textContent = '等待测试...';
		container.appendChild(summaryEl);

		logEl = document.createElement('div');
		logEl.style.cssText = 'padding:8px 10px;background:#0a260a;border-top:1px solid #305a30;font-family:ui-monospace,Menlo,monospace;font-size:12px;max-height:34vh;overflow:auto;';
		container.appendChild(logEl);

		document.body.appendChild(container);
	}

	function setVisible(v) {
		visible = v;
		if (v) {
			ensureUI();
			container.style.display = 'block';
		} else if (container) {
			container.style.display = 'none';
		}
	}

	function log(msg) {
		if (!visible) return;
		const time = new Date().toLocaleTimeString();
		logEl.innerHTML = `[${time}] ${msg}<br>` + logEl.innerHTML;
	}

	function updateSummary() {
		if (!visible) return;
		if (sampleCount === 0) { summaryEl.textContent = '等待测试...'; return; }
		const avgKeyToSFX = (accKeyToSFX / sampleCount).toFixed(2);
		const avgKeyToRAF = (accKeyToRAF / sampleCount).toFixed(2);
		summaryEl.innerHTML = `样本: ${sampleCount} 次 | 平均 Key→SFX: <b>${avgKeyToSFX}ms</b> | 平均 Key→RAF: <b>${avgKeyToRAF}ms</b>`;
	}

	// 记录下一帧的RAF时间
	function tick(ts) {
		lastRAF = ts || performance.now();
		requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);

	// 探针：SFX 调度开始
	const prevProbe = audio.onSFXStart;
	audio.onSFXStart = (info) => {
		try { if (typeof prevProbe === 'function') prevProbe(info); } catch (_) {}
		const { type, perfNow } = info || {};
		if (!visible) return;
		const keyToSFX = (perfNow || performance.now()) - lastKeyPerf;
		accKeyToSFX += keyToSFX;
		log(`SFX '${type}' 调度: key→sfx=${keyToSFX.toFixed(2)}ms`);
		updateSummary();
	};

	// 键盘监听
	window.addEventListener('keydown', (e) => {
		if (e.key === 'F9') {
			setVisible(!visible);
			if (visible) {
				// 激活音频，预热
				audio.ensureAudioReady().then(() => audio.primeAudio()).catch(() => {});
				log('测试已启用：J=move, K=rotate');
			}
			return;
		}
		if (!visible || e.repeat) return;
		if (e.key === 'j' || e.key === 'J') {
			lastKeyPerf = performance.now();
			sampleCount++;
			audio.playSFX('move');
			const keyToRAF = lastRAF - lastKeyPerf;
			accKeyToRAF += keyToRAF;
			log(`按键 'J': key→raf=${keyToRAF.toFixed(2)}ms`);
			updateSummary();
		}
		if (e.key === 'k' || e.key === 'K') {
			lastKeyPerf = performance.now();
			sampleCount++;
			audio.playSFX('rotate');
			const keyToRAF = lastRAF - lastKeyPerf;
			accKeyToRAF += keyToRAF;
			log(`按键 'K': key→raf=${keyToRAF.toFixed(2)}ms`);
			updateSummary();
		}
	});

	// 默认不显示，用户按 F9 开启
	setVisible(false);
})();


