import LoadingDebugger from '../debug/LoadingDebugger';

const HomePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ДИАГНОСТИКА</h1>
        <p className="text-xl">Проверяем наличие циклов рендеринга</p>
        <div className="mt-4 p-4 bg-white rounded shadow">
          <p className="mb-2">✅ Если справа внизу показывает Renders &lt; 10 - все хорошо</p>
          <p className="mb-2">❌ Если показывает TOO MANY RENDERS - есть проблема</p>
          <p className="text-sm text-gray-600">Подождите 5 секунд и посмотрите на счетчики</p>
        </div>
      </div>
      
      {/* Отладчик */}
      <SimpleDebugger />
    </div>
  );
};

export default HomePage;