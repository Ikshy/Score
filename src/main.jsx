import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {LogOut,RotateCcw,Users,Wallet,Clock3,ShieldCheck,CheckCircle2,LockKeyhole,RefreshCw,Sparkles,Flame,Zap} from 'lucide-react';
import './styles.css';

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=(SUPABASE_URL&&SUPABASE_ANON_KEY)?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;

// Updated contribution amounts and side/extra options
const AMOUNTS=[20,30,50];
const EXTRA_OPTIONS=[12, 6, 'Paper'];

function App(){
 const [profile,setProfile]=useState(null); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
 const [username,setUsername]=useState(''); const [pin,setPin]=useState(''); const [amount,setAmount]=useState(null); const [selectedExtra,setSelectedExtra]=useState(null);

 useEffect(()=>{
  const savedProfile=localStorage.getItem('score_profile');
  if(savedProfile){
   const p=JSON.parse(savedProfile);
   setProfile(p);
   loadRows();
  }
 },[]);

 async function loadRows(){
  const {data,error}=await supabase.from('today_contributions').select('*').order('contribution_order',{ascending:true}); 
  if(error){setError(error.message);return;} 
  setRows(data||[]);
 }

 useEffect(()=>{
  if(!profile)return; 
  const ch=supabase.channel('score-live')
   .on('postgres_changes',{event:'*',schema:'public',table:'contributions'},()=>loadRows())
   .on('postgres_changes',{event:'*',schema:'public',table:'daily_state'},()=>loadRows())
   .subscribe(); 
  return()=>{supabase.removeChannel(ch)};
 },[profile]);

 async function login(e){
  e.preventDefault();
  setError('');
  setLoading(true);

  const {data,error}=await supabase
   .from('profiles')
   .select('*')
   .ilike('username', username.trim())
   .eq('pin', pin.trim())
   .single();

  if(error || !data){
   setError('Username ba PIN vul hoyeche! Thik kore abar chesta korun.');
   setLoading(false);
   return;
  }

  setProfile(data);
  localStorage.setItem('score_profile', JSON.stringify(data));
  setLoading(false);
  loadRows();
 }

 async function contribute(){
  if(!amount || profile?.has_contributed) return; 
  setLoading(true);
  setError(''); 
  
  const {error} = await supabase.rpc('make_contribution', { 
   p_user_id: profile.id, 
   p_amount: amount 
  }); 

  if(error) {
   setError(error.message);
  } else {
   setNotice(`Awesome! ৳${amount} successfully added! 🎉`);
   setAmount(null);
   const {data: updatedProf} = await supabase.from('profiles').select('*').eq('id', profile.id).single();
   if(updatedProf) {
    setProfile(updatedProf);
    localStorage.setItem('score_profile', JSON.stringify(updatedProf));
   }
   await loadRows();
  }
  setLoading(false);
 }

 async function resetDay(){
  if(!confirm('Aajker din reset korte chan? Sob contribution clear hoye jabe!'))return;
  setLoading(true);
  const {error}=await supabase.rpc('reset_today');
  if(error) {
   setError(error.message);
  } else {
   setNotice('Board successfully reset kora hoyeche!');
   const {data: updatedProf} = await supabase.from('profiles').select('*').eq('id', profile.id).single();
   if(updatedProf) {
    setProfile(updatedProf);
    localStorage.setItem('score_profile', JSON.stringify(updatedProf));
   }
   await loadRows();
  }
  setLoading(false);
 }

 async function logout(){
  localStorage.removeItem('score_profile');
  setProfile(null);
  setRows([]);
  setUsername('');
  setPin('');
 }

 if(!supabase)return <Setup/>;
 if(!profile)return <Login username={username} setUsername={setUsername} pin={pin} setPin={setPin} login={login} loading={loading} error={error}/>;

 const mine=rows.find(r=>r.user_id===profile.id); 
 const visible=profile?.role==='admin'?rows:(profile?.has_contributed?rows.filter(r=>r.contribution_order<=mine?.contribution_order):[]); 
 const total=rows.reduce((s,r)=>s+Number(r.amount),0); 
 const count=rows.length;

 return (
  <main className="shell">
   <header className="top">
    <div>
      <div className="brand flex-brand"><Sparkles className="brand-icon" size={22}/> SCORE</div>
      <div className="sub">🚀 Daily Contribution Arena</div>
    </div>
    <div className="userbox">
      <span className="welcome-badge">👋 {profile?.display_name}</span>
      {profile?.role==='admin'&&<b className="admin-pill"><Flame size={14}/> ADMIN</b>}
      <button className="iconbtn pulse-hover" onClick={logout} title="Logout"><LogOut size={17}/></button>
    </div>
   </header>
   
   <section className="hero">
    <div>
      <span className="eyebrow">{new Date().toLocaleDateString('en-BD',{weekday:'long',day:'numeric',month:'long'})}</span>
      <h1>Aajker Mission Board 🎯</h1>
      <p>{profile?.has_contributed?'Apnar mission complete! Live board update dekhte thakun. ✨':'Chot Kore ekta amount select kore ajker board unlock kore felun!'}</p>
    </div>
    <div className="live animate-pulse"><span></span> LIVE SYNC</div>
   </section>

   <section className="stats">
     <Stat icon={<Users/>} label="Total Warriors" value={count}/>
     <Stat icon={<Wallet/>} label="Collected Pool" value={profile?.has_contributed||profile?.role==='admin'?`৳${total}`:'🔒 Locked'}/>
     <Stat icon={<Clock3/>} label="Your Status" value={profile?.has_contributed||profile?.role==='admin'?'⚡ Unlocked':'⏳ Pending'}/>
   </section>

   {/* Extra Sidebar / Bottom Options Section (12, 6, Paper) */}
   <section className="card extra-options-card">
     <div className="cardhead">
       <div>
         <small>QUICK EXTRA OPTIONS</small>
         <h2>Special Selectors</h2>
       </div>
       <Zap size={18} className="text-amber"/>
     </div>
     <p className="hint">Nicher option gulo theke apnar proyojon moto select korte paren:</p>
     <div className="amounts">
       {EXTRA_OPTIONS.map(opt => (
         <button 
           className={selectedExtra === opt ? 'selected extra-btn' : 'extra-btn'} 
           key={opt} 
           onClick={() => setSelectedExtra(opt)}
         >
           {typeof opt === 'number' ? `⚡ ${opt}` : `📄 ${opt}`}
         </button>
       ))}
     </div>
     {selectedExtra && <p className="selected-notice">Apni select korechen: <b>{selectedExtra}</b></p>}
   </section>

   {profile?.role==='admin'?<AdminPanel rows={rows} total={total} resetDay={resetDay} loading={loading}/>:<UserPanel profile={profile} rows={visible} count={count} amount={amount} setAmount={setAmount} contribute={contribute} loading={loading}/>} 
   
   {error&&<div className="alert error">⚠️ {error}</div>}
   {notice&&<div className="alert success"><CheckCircle2 size={16}/>{notice}</div>}
   
   <footer>🔥 Private SCORE • Fun & Engaging Edition • 8 Members Max</footer>
  </main>
 );
}

const Stat=({icon,label,value})=><div className="stat card-hover"><div className="staticon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>;

function UserPanel({profile,rows,count,amount,setAmount,contribute,loading}){
 return (
  <div className="grid">
   <section className="card contribution glow-card">
    <div className="cardhead">
      <div>
        <small>YOUR CONTRIBUTION</small>
        <h2>{profile.has_contributed?`৳${rows.find(r=>r.user_id===profile.id)?.amount||0}`:'Not yet'}</h2>
      </div>
      {profile.has_contributed?<span className="pill success-pill"><CheckCircle2 size={14}/> Done!</span>:<span className="pill locked-pill"><LockKeyhole size={14}/> Locked</span>}
    </div>
    {!profile.has_contributed&&<>
      <p className="hint">Ekta amount choose korun (20, 30 ba 50) ebong push kore magic dekho!</p>
      <div className="amounts">
        {AMOUNTS.map(a=><button className={amount===a?'selected':''} key={a} onClick={()=>setAmount(a)}>৳{a}</button>)}
      </div>
      <button className="push fun-btn" disabled={!amount||loading} onClick={contribute}>
        {loading?'Pushing to Board…🚀':'🚀 PUSH CONTRIBUTION'}
      </button>
    </>}
   </section>

   <section className="card board">
    <div className="cardhead">
      <div>
        <small>CONTRIBUTION BOARD</small>
        <h2>{profile.has_contributed?'Ke ke contribute korlo':'Board Locked 🔒'}</h2>
      </div>
      <span className="count">{profile.has_contributed?count:0} / 8 active</span>
    </div>
    {profile.has_contributed?<Board rows={rows}/>:<div className="locked"><LockKeyhole size={36} className="bounce-icon"/><b>Board is Locked!</b><span>Age apnar contribution submit korun, tarpor sobar naam dekhte paben. 👀</span></div>}
   </section>
  </div>
 );
}

function Board({rows}){
 return <div className="list">{rows.map((r, i)=><div className="row row-animate" key={r.id} style={{animationDelay: `${i * 0.05}s`}}><span className="rank">#{r.contribution_order}</span><div className="avatar">{r.display_name?.[0]?.toUpperCase()}</div><div className="name">{r.display_name}{r.is_me&&<em className="me-tag"> (YOU 🔥)</em>}</div><strong className="amount-badge">৳{r.amount}</strong></div>)}</div>;
}

function AdminPanel({rows,total,resetDay,loading}){
 return (
  <div className="card admin">
   <div className="adminhead">
     <div>
       <small>👑 ADMIN CONTROL CENTER</small>
       <h2>Today's Full Live Board</h2>
     </div>
     <button className="reset fun-reset" onClick={resetDay} disabled={loading}>
       <RotateCcw size={16}/> RESET TODAY
     </button>
   </div>
   <div className="adminsummary">
     <span>👥 {rows.length}/8 members contributed</span>
     <b>💰 ৳{total} total collected</b>
   </div>
   <Board rows={rows}/>
   <div className="auto"><RefreshCw size={16}/><span>Automatic reset is configured for <b>12:00 AM Bangladesh time</b>. ⏰</span></div>
  </div>
 );
}

function Login({username,setUsername,pin,setPin,login,loading,error}){
 return (
  <main className="loginwrap">
   <div className="loginbox fun-login-box">
    <div className="brand big flex-brand"><Sparkles size={28}/> SCORE</div>
    <p className="tag">🎮 Private Daily Contribution Arena</p>
    <form onSubmit={login}>
     <label>Username<input autoFocus value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. Sayem" required/></label>
     <label>4-digit PIN<input inputMode="numeric" maxLength="5" type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••" required/></label>
     <button className="loginbtn fun-btn" disabled={loading||!pin}>{loading?'Entering Arena…✨':'ENTER SCORE 🚀'}</button>
    </form>
    {error&&<div className="alert error">⚠️ {error}</div>}
    <div className="privacy"><ShieldCheck size={16}/> Secure & Private Members Only</div>
   </div>
  </main>
 );
}

function Setup(){
 return (
  <main className="loginwrap">
   <div className="loginbox">
    <div className="brand big">SCORE</div>
    <h2>⚡ One-minute setup</h2>
    <p className="tag">Add your Supabase URL and anon key to <code>.env.local</code>.</p>
    <pre>VITE_SUPABASE_URL=…{`\n`}VITE_SUPABASE_ANON_KEY=…</pre>
    <p className="hint">Then run <code>npm install</code> and <code>npm run dev</code>.</p>
   </div>
  </main>
 );
}

createRoot(document.getElementById('root')).render(<App/>);
