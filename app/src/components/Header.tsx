// app/src/components/Header.tsx
import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link--active' : 'nav-link';

export function Header() {
  return (
    <header className="app-header">
      <span className="app-header__title">Москва в кадре</span>
      <nav>
        <NavLink to="/" className={linkClass} end>
          Карта
        </NavLink>
        <NavLink to="/requests" className={linkClass}>
          Заявки
        </NavLink>
        <NavLink to="/cabinet" className={linkClass}>
          Кабинет
        </NavLink>
      </nav>
    </header>
  );
}
