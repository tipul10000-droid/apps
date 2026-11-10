# הזזת טעם בהקלטה קיימת (10.11.2026): לָמֶד ודָּלֶת יצאו במלרע בכל כתיב. ניתוח: במילה במלעיל של הילה (אָלֶף) גובה הצליל בשיא בתנועה הראשונה ויורד; במלרע השיא בתנועה השנייה.
# הסקריפט מנתח ב-WORLD (pyworld) ומסנתז מחדש עם קו גובה יורד מההברה הראשונה, ואופציונלית מאריך/מגביר את התנועה הראשונה ומקצר את השנייה.
# דרוש: pip install numpy scipy pyworld praat-parselmouth "setuptools<81", ו-ffmpeg. רץ גם בענן (בלי רשת).
import numpy as np,pyworld as pw,parselmouth,subprocess,sys,warnings;warnings.filterwarnings('ignore')
def load(f):
    s=parselmouth.Sound(f).convert_to_mono();return s.values[0].astype(np.float64),int(s.sampling_frequency)
def fix(src,out,v1,v2,stretch1=1.0,stretch2=1.0,gain=0.0,peak=238,low=152,ex=0.8):
    x,sr=load(src);fp=5.0
    f0,t=pw.harvest(x,sr,f0_floor=110,f0_ceil=450,frame_period=fp);sp=pw.cheaptrick(x,f0,t,sr);ap=pw.d4c(x,f0,t,sr)
    vo=np.where(f0>0)[0];a,b=t[vo[0]],t[vo[-1]]
    # new pitch: hold peak through first vowel, then smooth fall to low at end of voicing
    nf=f0.copy()
    for i in vo:
        tt=t[i]
        if tt<=v1[1]: nf[i]=peak*(0.97+0.03*(tt-a)/max(1e-3,v1[1]-a))
        else:
            r=(tt-v1[1])/max(1e-3,b-v1[1]);nf[i]=peak*(low/peak)**(r**ex)
    # loudness: +gain dB on first vowel, -gain on second
    g=np.ones(len(t))
    for i,tt in enumerate(t):
        if v1[0]<=tt<=v1[1]: g[i]=10**(gain/20)
        elif v2[0]<=tt<=v2[1]: g[i]=10**(-gain/20)
    sp=sp*(g[:,None]**2)
    # time warp
    idx=[]
    for i,tt in enumerate(t):
        k=stretch1 if v1[0]<=tt<=v1[1] else stretch2 if v2[0]<=tt<=v2[1] else 1.0
        idx+= [i]*0  # placeholder
    pos=0.0;src_idx=[]
    rate=np.array([1/stretch1 if v1[0]<=tt<=v1[1] else 1/stretch2 if v2[0]<=tt<=v2[1] else 1.0 for tt in t])
    while pos<len(t)-1:
        src_idx.append(pos);pos+=rate[int(pos)]
    src_idx=np.array(src_idx);i0=np.floor(src_idx).astype(int);fr=(src_idx-i0)[:,None];i1=np.minimum(i0+1,len(t)-1)
    F=np.where((nf[i0]>0)&(nf[i1]>0),nf[i0]*(1-fr[:,0])+nf[i1]*fr[:,0],np.where(nf[i0]>0,nf[i0],0))
    S=np.ascontiguousarray(sp[i0]*(1-fr)+sp[i1]*fr);A=np.ascontiguousarray(ap[i0]*(1-fr)+ap[i1]*fr)
    y=pw.synthesize(np.ascontiguousarray(F),S,A,sr,fp);y=y/max(1e-6,np.abs(y).max())*np.abs(x).max()
    w=out.replace('.mp3','.wav');import wave
    with wave.open(w,'wb') as W:
        W.setnchannels(1);W.setsampwidth(2);W.setframerate(sr);W.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',w,'-ar','24000','-ac','1','-b:a','48k',out]);import os;os.remove(w)
import os;A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','shilo','letters','audio')+'/';O=A+'try/'
W={'t17':('c014.mp3',(0.34,0.42),(0.52,0.66)),'t18':('c018.mp3',(0.33,0.51),(0.62,0.72))}
for k,(f,v1,v2) in W.items():
    fix(A+f,O+k+'_0.mp3',v1,v2)                                   # pitch only
    fix(A+f,O+k+'_1.mp3',v1,v2,1.35,0.8)                          # + durations
    fix(A+f,O+k+'_2.mp3',v1,v2,1.35,0.8,3.0,ex=0.45)                     # + loudness
    fix(A+f,O+k+'_3.mp3',v1,v2,1.6,0.7,5.0,peak=250,low=145,ex=0.4)     # stronger
print('ok')
