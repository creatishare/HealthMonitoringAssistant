import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-[200px]">
      <main className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
