import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen pb-20">
      <main className="p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
