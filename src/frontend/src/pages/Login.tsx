import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, user } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
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
      toast.error(error.message || error.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col justify-center p-6">
      <div className="mb-8">
        <h1 className="text-title text-gray-text-primary mb-2">欢迎回来</h1>
        <p className="text-helper text-gray-secondary">请登录您的账号</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-helper text-gray-secondary mb-2">手机号</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            className="input-field w-full"
            maxLength={11}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-helper text-gray-secondary">密码</label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-helper text-primary"
            >
              忘记密码？
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            className="input-field w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-center mt-6 text-helper text-gray-secondary">
        还没有账号？
        <button
          onClick={() => navigate('/register')}
          className="text-primary ml-1"
        >
          立即注册
        </button>
      </p>
    </div>
  )
}
