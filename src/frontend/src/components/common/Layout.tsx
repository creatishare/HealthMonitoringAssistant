import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-[240px]">
      <main className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
