// Замените функцию checkConnections в QuickDiagnostics.tsx
const checkConnections = async () => {
  setStatus(prev => ({ ...prev, checking: true }));
  
  try {
    console.log('🔍 Starting connection check...');
    
    // УПРОЩЕННАЯ проверка БД - используем системную функцию
    let dbStatus = false;
    let dbError = null;
    
    try {
      // Самый простой запрос к PostgreSQL
      const { data: dbData, error: dbErr } = await supabase.rpc('version');
      dbStatus = !dbErr;
      dbError = dbErr;
    } catch (err) {
      console.error('❌ DB check failed with exception:', err);
      dbStatus = false;
      dbError = err;
    }
    
    // Проверяем авторизацию
    let authStatus = false;
    let authError = null;
    
    try {
      const { data: authData, error: authErr } = await supabase.auth.getSession();
      authStatus = !authErr && !!authData.session;
      authError = authErr;
    } catch (err) {
      console.error('❌ Auth check failed with exception:', err);
      authStatus = false;
      authError = err;
    }
    
    setStatus({
      db: dbStatus,
      auth: authStatus,
      lastCheck: new Date().toLocaleTimeString(),
      checking: false
    });
    
    // Логируем результат
    console.log('🔍 Connection check result:', {
      database: dbStatus,
      auth: authStatus,
      dbError,
      authError,
      timestamp: new Date().toISOString()
    });
    
    // Если есть проблемы, логируем детали
    if (!dbStatus) {
      console.error('❌ Database connection failed:', dbError);
    }
    if (!authStatus) {
      console.warn('⚠️ Auth session issue:', authError || 'No session');
    }
    
  } catch (error) {
    console.error('❌ Connection check failed:', error);
    setStatus({
      db: false,
      auth: false,
      lastCheck: new Date().toLocaleTimeString(),
      checking: false
    });
  }
};