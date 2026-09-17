import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {LogOut,RotateCcw,Users,Wallet,Clock3,ShieldCheck,CheckCircle2,LockKeyhole,RefreshCw} from 'lucide-react';
import './styles.css';

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=(SUPABASE_URL&&SUPABASE_ANON_KEY)?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const AMOUNTS=[10,20,30,50];

function App(){
 const [profile,setProfile]=useState(null); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
 const [username,setUsername]=useState(''); const [pin,setPin]=useState(''); const [amount,setAmount]=useState(null);

 // লোকাল স্টোরেজ থেকে লগইন স্টেট ধরে রাখা যাতে রিফ্রেশ করলে লগআউট না হয়ে যায়
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

 // রিয়েলটাইম আপডেট সাবস্ক্রিপশন
 useEffect(()=>{
  if(!profile)return; 
  const ch=supabase.channel('score-live')
   .on('postgres_changes',{event:'*',schema:'public',table:'contributions'},()=>loadRows())
   .on('postgres_changes',{event:'*',schema:'public',table:'daily_state'},()=>loadRows())
   .subscribe(); 
  return()=>{supabase.removeChannel(ch)};
 },[profile]);

 // কাস্টম পিন ও ইউজারনেম দিয়ে লগইন লজিক
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
   setError('Username or PIN is incorrect.');
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
  
  // profile.id সহ ফাংশন কল করা
  const {error} = await supabase.rpc('make_contribution', { 
    p_user_id: profile.id, 
    p_amount: amount 
  }); 

  if(error) {
   setError(error.message);
  } else {
   setNotice(`৳${amount} added successfully.`);
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
  if(!confirm('Reset today? This clears today\'s contribution board.'))return;
  setLoading(true);
  const {error}=await supabase.rpc('reset_today');
  if(error) {
   setError(error.message);
  } else {
   setNotice('Today has been reset.');
   const {data: updatedProf} = await supabase.from('profiles').select('*').eq('id', profile.id).single();
   if(updatedProf) {
    setProfile(updatedProf);
    localStorage.setItem('score_profile', JSON.stringify(updatedProf));
   }
   await loadRows();
  }
  setLoading(false);
 }

 function logout(){
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
    <div><div className="brand">SCORE</div><div className="sub">Daily Contribution</div></div>
    <div className="userbox"><span>{profile?.display_name}</span>{profile?.role==='admin'&&<b>ADMIN</b>}<button className="iconbtn" onClick={logout} title="Logout"><LogOut size={17}/></button></div>
   </header>
   <section className="hero"><div><span className="eyebrow">{new Date().toLocaleDateString('en-BD',{weekday:'long',day:'numeric',month:'long'})}</span><h1>Today's board</h1><p>{profile?.has_contributed?'Your board is live and updating in real time.':'Make your contribution to unlock today\'s board.'}</p></div><div className="live"><span></span> LIVE</div></section>
   <section className="stats"><Stat icon={<Users/>} label="People" value={count}/><Stat icon={<Wallet/>} label="Total" value={profile?.has_contributed||profile?.role==='admin'?`৳${total}`:'••••'}/><Stat icon={<Clock3/>} label="Status" value={profile?.has_contributed||profile?.role==='admin'?'Unlocked':'Locked'}/></section>
   {profile?.role==='admin'?<AdminPanel rows={rows} total={total} resetDay={resetDay} loading={loading}/>:<UserPanel profile={profile} rows={visible} count={count} amount={amount} setAmount={setAmount} contribute={contribute} loading={loading}/>} 
   {error&&<div className="alert error">{error}</div>}
   {notice&&<div className="alert success"><CheckCircle2 size={16}/>{notice}</div>}
   <footer>Private SCORE • max 8 members • realtime board</footer>
  </main>
 );
}

const Stat=({icon,label,value})=><div className="stat"><div className="staticon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>;

function UserPanel({profile,rows,count,amount,setAmount,contribute,loading}){
 return (
  <div className="grid">
   <section className="card contribution">
    <div className="cardhead"><div><small>YOUR CONTRIBUTION</small><h2>{profile.has_contributed?`৳${rows.find(r=>r.user_id===profile.id)?.amount||0}`:'Not yet'}</h2></div>{profile.has_contributed?<span className="pill"><CheckCircle2 size={14}/> Submitted</span>:<span className="pill muted"><LockKeyhole size={14}/> Locked</span>}</div>
    {!profile.has_contributed&&<><p className="hint">Choose one amount. Once you push it, the board unlocks for you.</p><div className="amounts">{AMOUNTS.map(a=><button className={amount===a?'selected':''} key={a} onClick={()=>setAmount(a)}>৳{a}</button>)}</div><button className="push" disabled={!amount||loading} onClick={contribute}>{loading?'Pushing…':'PUSH CONTRIBUTION'}</button></>}
   </section>
   <section className="card board">
    <div className="cardhead"><div><small>CONTRIBUTION BOARD</small><h2>{profile.has_contributed?'Who has contributed':'Board locked'}</h2></div><span className="count">{profile.has_contributed?count:0} people</span></div>
    {profile.has_contributed?<Board rows={rows}/>:<div className="locked"><LockKeyhole size={30}/><b>Contribute to unlock</b><span>You won't see amounts until you submit today.</span></div>}
   </section>
  </div>
 );
}

function Board({rows}){
 return <div className="list">{rows.map(r=><div className="row" key={r.id}><span className="rank">{r.contribution_order}</span><div className="avatar">{r.display_name?.[0]?.toUpperCase()}</div><div className="name">{r.display_name}{r.is_me&&<em> YOU</em>}</div><strong>৳{r.amount}</strong></div>)}</div>;
}

function AdminPanel({rows,total,resetDay,loading}){
 return (
  <div className="card admin">
   <div className="adminhead"><div><small>ADMIN CONTROL</small><h2>Today's full board</h2></div><button className="reset" onClick={resetDay} disabled={loading}><RotateCcw size={16}/> RESET TODAY</button></div>
   <div className="adminsummary"><span>{rows.length}/8 contributed</span><b>৳{total} total</b></div>
   <Board rows={rows}/>
   <div className="auto"><RefreshCw size={16}/><span>Automatic reset is configured for <b>12:00 AM Bangladesh time</b>.</span></div>
  </div>
 );
}

function Login({username,setUsername,pin,setPin,login,loading,error}){
 return (
  <main className="loginwrap">
   <div className="loginbox">
    <div className="brand big">SCORE</div>
    <p className="tag">Private daily contribution board</p>
    <form onSubmit={login}>
     <label>Username<input autoFocus value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. Sayem" required/></label>
     <label>4-digit PIN<input inputMode="numeric" maxLength="5" value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••" required/></label>
     <button className="loginbtn" disabled={loading||!pin}>{loading?'Signing in…':'ENTER SCORE'}</button>
    </form>
    {error&&<div className="alert error">{error}</div>}
    <div className="privacy"><ShieldCheck size={16}/> Private members only</div>
   </div>
  </main>
 );
}

function Setup(){
 return (
  <main className="loginwrap">
   <div className="loginbox">
    <div className="brand big">SCORE</div>
    <h2>One-minute setup</h2>
    <p className="tag">Add your Supabase URL and anon key to <code>.env.local</code>.</p>
    <pre>VITE_SUPABASE_URL=…{`\n`}VITE_SUPABASE_ANON_KEY=…</pre>
    <p className="hint">Then run <code>npm install</code> and <code>npm run dev</code>.</p>
   </div>
  </main>
 );
}

createRoot(document.getElementById('root')).render(<App/>);