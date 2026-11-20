const cues = {
  wood_cast:[140,210,285], wood_hit:[95,155,235],
  mote_picked:[740,980], lantern_lit:[440,660,880], pulse:[215,450], player_hit:[190,105],
  jump:[260,420], dash:[150,460], won:[390,520,660,780], lost:[330,220,165],
  shade_spawned:[135,116], countdown:[540], wind_warning:[295,265,223], charm_picked:[520,780,1040],
};

export function createSound() {
  let audio, gain, music;
  let volume=.45;
  function tone(frequency,start,length,level,type) {
    const oscillator=audio.createOscillator(), envelope=audio.createGain();
    oscillator.type=type; oscillator.frequency.value=frequency;
    envelope.gain.setValueAtTime(.0001,start);
    envelope.gain.exponentialRampToValueAtTime(level,start+.03);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+length);
    oscillator.connect(envelope); envelope.connect(gain);
    oscillator.start(start); oscillator.stop(start+length+.02);
  }
  return {
    unlock() {
      if (!audio && globalThis.AudioContext) {
        audio=new AudioContext(); gain=audio.createGain(); gain.gain.value=volume; gain.connect(audio.destination);
      }
      if (audio?.state==='suspended') audio.resume().catch(()=>{});
    },
    setVolume(next) { volume=next; if (gain) gain.gain.value=next; },
    play(name) {
      if (audio?.state!=='running' || !cues[name]) return;
      cues[name].forEach((pitch,i)=>tone(pitch,audio.currentTime+i*.095,.17,.15,'triangle'));
    },
    setMusic(enabled) {
      if (enabled && !music) {
        let note=0;
        const pitches=[110,130.81,164.81,196,164.81,130.81];
        music=setInterval(()=>{
          if (audio?.state==='running') tone(pitches[note++ % pitches.length],audio.currentTime,1.6,.055,'sine');
        },1200);
      } else if (!enabled && music) { clearInterval(music); music=undefined; }
    },
  };
}
