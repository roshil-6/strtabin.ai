import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Canvas from './components/Canvas';
import TimelineSection from './components/TimelineSection';
import TodoSection from './components/TodoSection';
import StrabView from './components/StrabView';
import CalendarView from './components/CalendarView';



function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/strategy/:id" element={<Canvas />} />
      <Route path="/canvas/:id" element={<Canvas />} /> {/* Legacy support */}
      <Route path="/timeline/:id" element={<TimelineSection />} />
      <Route path="/todo/:id" element={<TodoSection />} />
      <Route path="/calendar/:id" element={<CalendarView />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/strab/:id" element={<StrabView />} />
    </Routes>
  );
}

export default App;
