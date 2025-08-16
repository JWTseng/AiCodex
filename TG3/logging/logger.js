(function(global){
  class GameLogger {
    constructor(options={}){
      this.maxEntries = options.maxEntries || 3000;
      this.enable = options.enable !== false;
      this.buffer = [];
      this.sessionId = Date.now() + '-' + Math.random().toString(36).slice(2,8);
      this.attachGlobalErrorHandlers();
    }
    now(){ return new Date().toISOString(); }
    push(entry){
      if(!this.enable) return;
      this.buffer.push(entry);
      if(this.buffer.length > this.maxEntries){
        this.buffer.splice(0, this.buffer.length - this.maxEntries);
      }
    }
    info(message, data){ this.push({ts:this.now(), lvl:'info', message, data}); }
    warn(message, data){ this.push({ts:this.now(), lvl:'warn', message, data}); }
    error(message, data){ this.push({ts:this.now(), lvl:'error', message, data}); }
    event(type, data){ this.push({ts:this.now(), lvl:'evt', type, data}); }
    export(){ return { sessionId: this.sessionId, createdAt: this.now(), entries: this.buffer.slice() }; }
    download(){
      const blob = new Blob([JSON.stringify(this.export(), null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tetris_log_${this.sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    }
    clear(){ this.buffer = []; }
    attachGlobalErrorHandlers(){
      window.addEventListener('error', (e)=>{
        this.error('window.error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error && e.error.stack });
      });
      window.addEventListener('unhandledrejection', (e)=>{
        this.error('unhandledrejection', { reason: (e.reason && (e.reason.message || e.reason.toString())) || 'unknown', stack: e.reason && e.reason.stack });
      });
      document.addEventListener('keydown', (e)=>{
        if (e.ctrlKey && (e.key === 'l' || e.key === 'L')){
          e.preventDefault();
          this.download();
        }
      });
    }
  }
  global.GameLogger = new GameLogger({ maxEntries: 5000 });
})(window);
