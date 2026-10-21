import json,os,subprocess,sys,re
sys.argv=['x']
src=open('audio6.py').read(); exec(src[:src.index('# ---------- voices')])   # sprite(), dur()
LINES={
 'ratking':[("I'm the king of the rats! And don't you forget it.","Ratking_hero_anim_intro_02"),
  ("They're not fighting me. They're fighting me and 100 of my friends.","Ratking_select_10"),
  ("Long Island is gonna be mine.","Ratking_select_03"),
  ("Kiss the ring or eat the dirt! Your choice.","Ratking_hero_anim_intro_07"),
  ("You mess with one of us, you mess with all of us.","Ratking_hero_anim_intro_14"),
  ("Who's exterminating who now!","Ratking_kill_anyhero_10"),
  ("From the sewers to the streets, baby!","Ratking_upgrade_power4_10"),
  ("No one can kill the king.","Ratking_killstreak_high_02")],
 'solomon':[("I'm always three moves ahead.","Chessmaster_select_10"),
  ("Those with real strength don't need to show it.","Chessmaster_select_03"),
  ("They don't know it, but they've already lost.","Chessmaster_hero_anim_intro_13"),
  ("That was one bad gambit.","Chessmaster_kill_anyhero_06"),
  ("Bow... before the queen.","Chessmaster_use_power4_02"),
  ("Kid, you've got a lot to learn.","Chessmaster_kill_anyhero_01"),
  ("Should we put a little money on this?","Chessmaster_hero_anim_intro_21"),
  ("First rule of the hustle: let them think they're winning!","Chessmaster_desperation_power4_03")],
 'danny':[("Deadman Danny, at your service.","Deadpack_select_01"),
  ("I'm probably gonna explode, but that's okay. It's for science!","Deadpack_hero_anim_intro_20"),
  ("Safety first!","Deadpack_use_power4_02"),
  ("Victory, my friends, is a Fairfax guarantee.","Deadpack_kill_anyhero_02"),
  ("Have a patron problem? Try the Chimera Mark 1 today!","Deadpack_hero_anim_intro_16"),
  ("Please, hold your applause until the carnage comes to a complete stop.","Deadpack_killstreak_high_03"),
  ("And the best part: there's no federal regulation on jetpacks.","Deadpack_use_power4_08"),
  ("Become a soaring bird of prey with the Chimera Mark 1!","Deadpack_upgrade_power4_10")],
 'violet':[("I'm ready to make a name for myself.","Artist_hero_anim_intro_02"),
  ("Inspiration can come from some weird places.","Artist_select_08"),
  ("My art has a... unique point of view.","Artist_hero_anim_intro_18"),
  ("Welcome to my art show.","Artist_use_power4_09"),
  ("I think I cured my imposter syndrome!","Artist_killstreak_high_02"),
  ("This beats doing caricatures on the boardwalk.","Artist_hero_anim_intro_03"),
  ("Sure, I'm into group projects.","Artist_select_10"),
  ("Time to make my mark.","Artist_use_power4_08")],
 'baba':[("They think they know magic? Oh... I'll show 'em some magic.","Baba_select_08"),
  ("There ain't no city like New York.","Baba_select_01"),
  ("God, I love birds!","Baba_use_power4_01_alt_01"),
  ("Pssh, tourists.","Baba_killstreak_start_05"),
  ("You asked for this, dearie.","Baba_use_power4_08"),
  ("Time to stretch my legs... well, the bench's legs, you get the idea.","Baba_hero_anim_intro_01"),
  ("I'm not dead yet.","Baba_hero_anim_intro_07"),
  ("Underestimate me at your own risk.","Baba_hero_anim_intro_20")],
 'harrow':[("You will address me as Nurse Harrow.","Nurse_hero_anim_intro_01"),
  ("Trust me, I know best.","Nurse_select_05"),
  ("Treatment is about to begin.","Nurse_select_10"),
  ("I fear no spirit, demon, or unruly family member.","Nurse_select_08"),
  ("I tolerate no disobedience.","Nurse_hero_anim_intro_02"),
  ("At least I don't have to fill out an incident report.","Nurse_kill_anyhero_06"),
  ("Behave.","Nurse_kill_anyhero_10"),
  ("Where's an orderly when you need one…","Nurse_kill_anyhero_04")]}
VOICE=json.load(open('xg/voice6.json'))
for hid,lines in LINES.items():
    clips=[]
    for txt,f in lines:
        p=f'ext/vo/{f}.mp3'
        if not os.path.exists(p) or os.path.getsize(p)<2000:
            subprocess.run(['curl','-s','--max-time','60','-o',p,f'https://cdn.deadlock.wiki/{f}.mp3'],check=True)
        assert os.path.getsize(p)>2000,(p,os.path.getsize(p))
        clips.append((p,None))
    segs=sprite(clips,f'site/img/vo/{hid}.mp3',gap=.25,ac=1,q=0)
    VOICE[hid]={'s':[lines[0][0],0],'r':[[t,i+1] for i,(t,f) in enumerate(lines[1:])],'seg':segs}
    print(hid,len(lines),os.path.getsize(f'site/img/vo/{hid}.mp3')//1024,'KB',segs[:2])
json.dump(VOICE,open('xg/voice6.json','w'),ensure_ascii=False)
