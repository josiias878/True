# Host-Video schneiden (läuft in der Higgsfield-Sandbox, 0 Credits).
# Voraussetzungen im Arbeitsordner: v<N>.mp4 (Gemini-Rohclip), words.json (faster-whisper word_timestamps,
# "Kolby"→"Kolbi" korrigiert), Karten c1/c2/c3.png, end-*.png (site/img/v), click/pop/whoosh/shutter.wav (sox).
# Aufruf: python3 compose-host.py v1 v3 v5  → v<N>-final.mp4
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
S=1.2; FONT='/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
W=json.load(open('words.json'))
# Beispiel-Banner
f=ImageFont.truetype(FONT,44); t='Beispiel: 3 Dosen à 20 € = 60 € im Monat'
im=Image.new('RGBA',(1000,110),(0,0,0,0)); d=ImageDraw.Draw(im); w=d.textlength(t,font=f)
d.rounded_rectangle(((1000-w)/2-30,0,(1000+w)/2+30,100),50,fill=(246,196,83,255)); d.text(((1000-w)/2,22),t,font=f,fill=(25,25,35,255)); im.save('ex.png')
# Karten: (Bild, Wort-Index Start, Wort-Index Ende, y)
CFG={
 'v1':dict(hook='Welche bringt DIR was?',end='end-sparen.png',green={'dir','einzeln','monat','nichts'},
   cards=[('c1.png',1,6,200),('c2.png',8,12,380)],banner=None),
 'v3':dict(hook='Was kostet dein Stack?',end='end-sparen.png',green={'stack','monat','geld','nichts'},
   cards=[('c1.png',3,7,200),('c3.png',8,13,420)],banner=(20,None)),
 'v5':dict(hook='Erst dein Normal.',end='end-gratis.png',green={'normal','ändert','bauchgefühl'},
   cards=[('c2.png',6,15,380)],banner=None),
}
def ts(t): return f"0:00:{t:05.2f}"
def build(v):
    c=CFG[v]; ws=W[v]; st=lambda i: ws[i][0]/S
    D=round(ws[-1][1]/S+0.35,2)
    # Untertitel: 2-3 Wörter, Satzende bricht
    chunks=[];cur=[]
    for i,w in enumerate(ws):
        cur.append(i)
        if len(cur)>=3 or w[2][-1] in '.?,:': chunks.append(cur);cur=[]
    if cur: chunks.append(cur)
    head=f"""[Script Info]
PlayResX: 1080
PlayResY: 1920
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: C,Montserrat ExtraBold,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,1,0,0,0,100,100,0,0,1,7,3,2,60,60,470,1
Style: H,Montserrat ExtraBold,84,&H00191923,&H00191923,&H0053C4F6,&H0053C4F6,1,0,0,0,100,100,0,0,3,22,0,8,60,60,150,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    L=[f"Dialogue: 1,{ts(0)},{ts(1.6)},H,,0,0,0,,{{\\fscx60\\fscy60\\t(0,120,\\fscx105\\fscy105)\\t(120,200,\\fscx100\\fscy100)}}{c['hook']}"]
    for k,ch in enumerate(chunks):
        a=st(ch[0]); b=st(chunks[k+1][0]) if k+1<len(chunks) else D-0.1
        b=min(b, ws[ch[-1]][1]/S+0.5)
        txt=' '.join(('{\\c&H00A0D63E&}'+ws[i][2]+'{\\c&H00FFFFFF&}') if ws[i][2].lower().strip('.,?:!') in c['green'] else ws[i][2] for i in ch)
        L.append(f"Dialogue: 0,{ts(a)},{ts(b)},C,,0,0,0,,{{\\fscx70\\fscy70\\t(0,90,\\fscx108\\fscy108)\\t(90,160,\\fscx100\\fscy100)}}{txt}")
    open(v+'.ass','w').write(head+'\n'.join(L)+'\n')
    cards=[(img,round(st(a),2),round(st(b),2) if b<len(ws) else D,y) for img,a,b,y in c['cards']]
    # Satzgrenzen ohne Karte -> Zoom-Wechsel
    sb=[round(st(i+1),2) for i,w in enumerate(ws[:-1]) if w[2][-1] in '.?,:']
    incard=lambda t: any(a-0.05<=t<=b for _,a,b,_ in cards)
    cuts=[t for t in sb if not incard(t)]
    zw=[]; edges=[0]+cuts+[D]
    for i in range(len(edges)-1):
        if i%2==1: zw.append((edges[i],edges[i+1]))
    for _,a,b,_ in cards: zw.append((a,b))
    Z='+'.join(f'between(t,{a},{b})' for a,b in zw) or '0'
    flashes=[0]+[a for _,a,_,_ in cards]
    FL='+'.join(f'between(t,{t},{t+0.06:.2f})' for t in flashes)
    inputs=['-i',v+'.mp4']
    for img,_,_,_ in cards: inputs+=['-i',img]
    nI=1+len(cards); endI=nI; inputs+=['-i',c['end']]; nI+=1
    banI=None
    if c['banner']: banI=nI; inputs+=['-i','ex.png']; nI+=1
    sfx=[('shutter.wav',0)]+[('click.wav',a) for _,a,_,_ in cards]+[('pop.wav',t) for t in cuts]
    if c['banner']: bt=round(st(c['banner'][0]),2); sfx.append(('click.wav',bt))
    sfxI=nI
    for s,_ in sfx: inputs+=['-i',s]; nI+=1
    wI=nI; inputs+=['-i','whoosh.wav','-i','shutter.wav']; nI+=2
    slide=lambda t: f"if(lt(t-{t},0.14),W-(W-(W-w)/2)*(t-{t})/0.14,(W-w)/2)"
    fc=[f"[0:v]setpts=PTS/{S},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=0:{D},setsar=1,split[n][z0]",
        "[z0]scale=1242:2208,crop=1080:1920:81:150[z]", f"[n][z]overlay=0:0:enable='{Z}'[h0]"]
    last='h0'
    for k,(img,a,b,y) in enumerate(cards):
        fc.append(f"[{last}][{k+1}:v]overlay=x='{slide(a)}':y={y}:enable='between(t,{a},{b})'[h{k+1}]"); last=f'h{k+1}'
    if banI:
        fc.append(f"[{last}][{banI}:v]overlay=x=(W-w)/2:y=1180:enable='between(t,{bt},{D})'[hb]"); last='hb'
    fc+= [f"color=white:s=1080x1920:r=30:d={D},format=rgba,colorchannelmixer=aa=0.85[fl]", f"[{last}][fl]overlay=enable='{FL}'[hf]",
          f"[hf]subtitles={v}.ass:fontsdir=/usr/share/fonts/truetype/higgsfield,format=yuv420p[hv]",
          f"[{endI}:v]zoompan=z='min(zoom+0.0012,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=66:s=1080x1920:fps=30,trim=end_frame=66,format=yuv420p,setsar=1[ev]",
          "color=white:s=1080x1920:r=30:d=2.2,format=rgba,colorchannelmixer=aa=0.85[fl2]","[ev][fl2]overlay=enable='between(t,0,0.07)',format=yuv420p[ev2]",
          f"[0:a]atempo={S},aresample=48000,aformat=channel_layouts=stereo,atrim=0:{D},apad=whole_dur={D}[voice]"]
    mix=['[voice]']
    for k,(s,t) in enumerate(sfx):
        ms=int(t*1000); fc.append(f"[{sfxI+k}:a]adelay={ms}|{ms}[s{k}]"); mix.append(f'[s{k}]')
    fc.append(''.join(mix)+f"amix=inputs={len(mix)}:normalize=0:duration=first[va]")
    fc+= [f"[{wI}:a]apad=whole_dur=2.2[w1]",f"[{wI+1}:a]adelay=50|50,apad=whole_dur=2.2[w2]","[w1][w2]amix=inputs=2:normalize=0:duration=first[ea]","[hv][va][ev2][ea]concat=n=2:v=1:a=1[v][au]"]
    cmd=['ffmpeg','-y','-v','error']+inputs+['-filter_complex',';'.join(fc),'-map','[v]','-map','[au]','-c:v','libx264','-crf','20','-preset','veryfast','-c:a','aac','-b:a','160k','-movflags','+faststart',f'{v}-final.mp4']
    subprocess.run(cmd,check=True)
    print(v,'D',D,'cards',cards,'cuts',cuts)
for v in sys.argv[1:]: build(v)
