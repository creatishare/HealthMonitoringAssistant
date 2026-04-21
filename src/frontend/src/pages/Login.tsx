import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, user } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || !password) {
      toast.error('请填写手机号和密码')
      return
    }

    setLoading(true)
    try {
      await login(phone, password)
      const nextUser = useAuthStore.getState().user ?? user
      toast.success('登录成功')
      navigate(nextUser?.onboardingCompleted ? '/' : '/onboarding')
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-bg px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-gray-border bg-gray-card shadow-card backdrop-blur-2xl md:grid-cols-[0.9fr_1fr]">
        <section className="hidden bg-gradient-to-br from-primary/14 via-white/75 to-emerald-50/80 p-8 dark:from-primary/22 dark:via-white/5 dark:to-emerald-950/20 md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary text-white shadow-[0_16px_32px_rgba(62,99,221,0.26)]">
                <HeartPulse size={28} />
              </div>
              <h1 className="mt-6 text-title text-gray-text-primary">肾健康助手</h1>
              <p className="mt-3 text-body text-gray-text-secondary">把每日打卡、化验指标和用药提醒放进一个安静、清晰的健康工作台。</p>
            </div>
            <div className="rounded-[26px] border border-white/60 bg-white/66 p-5 text-helper text-gray-text-secondary backdrop-blur-xl dark:border-white/8 dark:bg-white/5">
              数据仅用于日常记录与趋势整理，不能替代专业医疗诊断和治疗建议。
            </div>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="mb-8 md:hidden">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary text-white">
              <HeartPulse size={24} />
            </div>
            <h1 className="text-title text-gray-text-primary">肾健康助手</h1>
          </div>

          <div className="mb-8">
            <p className="section-kicker">欢迎回来</p>
            <h2 className="mt-2 text-page-title text-gray-text-primary">登录您的账号</h2>
            <p className="mt-2 text-helper text-gray-text-secondary">继续查看今天的记录、提醒和趋势。</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-helper font-medium text-gray-text-secondary">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="input-field"
                maxLength={11}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-helper font-medium text-gray-text-secondary">密码</label>
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-helper font-medium text-primary">
                  忘记密码？
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-text-helper transition-colors hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-helper text-gray-text-secondary">
            还没有账号？
            <button onClick={() => navigate('/register')} className="ml-1 font-medium text-primary">
              立即注册
            </button>
          </p>
        </section>
      </div>
    </div>
  )
}
