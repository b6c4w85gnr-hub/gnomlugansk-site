(() => {
  const api=window.GnomAPI;
  const form=document.querySelector('form[data-auth]'); if(!form)return;
  const mode=form.dataset.auth, status=document.querySelector('#auth-status');
  form.addEventListener('submit',async e=>{
    e.preventDefault(); status.className=''; status.textContent='Подождите…';
    const email=form.elements.email.value.trim(), password=form.elements.password.value;
    try{
      if(mode==='setup'){
        const setupCode=form.elements.setup_code.value.trim();
        const data=await api.signup(email,password,setupCode);
        if(data?.access_token){status.className='success';status.textContent='Владелец создан. Перенаправляю…';setTimeout(()=>location.href='../admin/',700)}
        else{status.className='success';status.textContent='Аккаунт создан. Если пришло письмо подтверждения, подтвердите e-mail, затем войдите.'}
      }else{
        await api.login(email,password); status.className='success'; status.textContent='Вход выполнен. Перенаправляю…'; setTimeout(()=>location.href='../admin/',500);
      }
    }catch(err){status.className='error';status.textContent=err.message||'Ошибка входа'}
  });
})();
