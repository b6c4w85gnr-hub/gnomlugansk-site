(() => {
  const cfg = window.GNOM_CONFIG;
  const rest = cfg.supabaseUrl + '/rest/v1';
  const auth = cfg.supabaseUrl + '/auth/v1';
  const KEY = cfg.supabaseKey;
  const TOKEN_KEY = 'gnom_auth_tokens_v1';

  function tokens(){ try{return JSON.parse(localStorage.getItem(TOKEN_KEY)||'null')}catch{return null} }
  function saveTokens(data){
    if (data?.access_token) localStorage.setItem(TOKEN_KEY, JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+((data.expires_in||3600)*1000)}));
  }
  function clearTokens(){localStorage.removeItem(TOKEN_KEY)}
  async function json(res){ const text=await res.text(); let body=null; try{body=text?JSON.parse(text):null}catch{body=text} if(!res.ok){const e=new Error(body?.msg||body?.message||body?.error_description||body?.error||`HTTP ${res.status}`);e.status=res.status;throw e} return body }
  async function authFetch(url,opts={}){
    let t=tokens();
    if(t?.refresh_token && t.expires_at && t.expires_at < Date.now()+30000){ try{t=await refresh()}catch{clearTokens();t=null} }
    const headers={apikey:KEY,...(opts.headers||{})}; if(t?.access_token) headers.Authorization='Bearer '+t.access_token;
    return fetch(url,{...opts,headers});
  }
  async function refresh(){const t=tokens();if(!t?.refresh_token)throw new Error('No session');const res=await fetch(auth+'/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token})});const data=await json(res);saveTokens(data);return tokens()}
  async function login(email,password){const res=await fetch(auth+'/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const data=await json(res);saveTokens(data);return data}
  async function signup(email,password,setupCode){const res=await fetch(auth+'/signup?redirect_to='+encodeURIComponent(cfg.siteUrl+'/login/'),{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{setup_code:setupCode}})});const data=await json(res);if(data?.access_token)saveTokens(data);return data}
  async function getUser(){const res=await authFetch(auth+'/user');return json(res)}
  async function logout(){try{const res=await authFetch(auth+'/logout',{method:'POST'});if(res.status!==204)await json(res)}catch{} clearTokens()}
  function headers(extra={}){const t=tokens();return {apikey:KEY,'Content-Type':'application/json',...(t?.access_token?{Authorization:'Bearer '+t.access_token}:{}),...extra}}
  async function request(path,{method='GET',body,prefer}={}){const h=headers(prefer?{Prefer:prefer}:{});const res=await fetch(rest+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});return json(res)}
  async function select(table,query=''){return request('/'+table+(query?'?'+query:''))}
  async function insert(table,body,{returning=false}={}){return request('/'+table,{method:'POST',body,prefer:returning?'return=representation':'return=minimal'})}
  async function update(table,filter,body){return request('/'+table+'?'+filter,{method:'PATCH',body,prefer:'return=minimal'})}
  async function remove(table,filter){return request('/'+table+'?'+filter,{method:'DELETE',prefer:'return=minimal'})}
  window.GnomAPI={select,insert,update,remove,login,signup,getUser,logout,tokens,clearTokens};
})();
