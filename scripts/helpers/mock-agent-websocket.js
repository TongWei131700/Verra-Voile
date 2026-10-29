(() => {
 const Native = window.WebSocket;
 class Mock extends EventTarget {
  constructor(url, protocols) {
   super(); if(!String(url).includes('/socket.io/'))return new Native(url, protocols);
   this.url=String(url);this.readyState=0;this.bufferedAmount=0;this.binaryType='arraybuffer';
   setTimeout(()=>{this.readyState=1;this.fire('open',new Event('open'));this.message('0'+JSON.stringify({sid:'mock',upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));},0);
  }
  fire(name,e){this.dispatchEvent(e);this['on'+name]?.(e)}
  message(data){this.fire('message',new MessageEvent('message',{data}))}
  send(data){if(data.startsWith('40/agent,')){queueMicrotask(()=>this.message('40/agent,'+JSON.stringify({sid:'agent'})));window.__agentEvent=e=>this.message('42/agent,'+JSON.stringify(['agent_event',e]));} else if(data.startsWith('42/agent,')){const event=JSON.parse(data.slice('42/agent,'.length));(window.__sent??=[]).push(event);}}
  close(){this.readyState=3;this.fire('close',new CloseEvent('close'))}
 }
 Object.assign(Mock,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});window.WebSocket=Mock;
})();
