"""Audio sprite helpers: join short clips into one mp3 and return where each clip starts. Needs ffmpeg."""
import math, os, re, subprocess, tempfile
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode())
def sprite(clips,out,br='96k',gap=.25,ac=1,q=None):
    """clips: list of (path, maxlen). returns [(start,dur)]"""
    tmp=[];segs=[];t=0.0
    for i,c in enumerate(clips):
        f,mx=c[0],c[1]; tp=c[2] if len(c)>2 else None
        d=min(dur(f),mx) if mx else dur(f)
        fo=max(0,d-0.35) if mx and dur(f)>mx else None
        af=f'afade=t=out:st={fo:.2f}:d=0.35,' if fo is not None else ''
        if tp:
            vd=subprocess.run(['ffmpeg','-v','info','-i',f,'-t',f'{d:.3f}','-af','volumedetect','-f','null','-'],capture_output=True).stderr.decode()
            mv=float(re.search(r'max_volume: ([-\d.]+) dB',vd).group(1))
            af+=f'volume={20*math.log10(tp)-mv:.2f}dB,'
        tf=os.path.join(tempfile.gettempdir(),f'sp_{i}.wav')
        # trim inside the filter chain so the silent gap after each clip survives (an output -t cut it off)
        subprocess.run(['ffmpeg','-y','-v','error','-i',f,'-af',f'atrim=0:{d:.3f},asetpts=PTS-STARTPTS,'+af+f'apad=pad_dur={gap}','-ac',str(ac),'-ar','44100',tf],check=True)
        dd=dur(tf); assert dd>d+gap*.5, (f,d,dd); segs.append([round(t,3),round(d,3)]); t+=dd; tmp.append(tf)
    lst=os.path.join(tempfile.gettempdir(),'sp_list.txt'); open(lst,'w').write(''.join(f"file '{x}'\n" for x in tmp))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-ac',str(ac)]+(['-q:a',str(q)] if q is not None else ['-b:a',br])+[out],check=True)
    for x in tmp: os.remove(x)
    return segs
