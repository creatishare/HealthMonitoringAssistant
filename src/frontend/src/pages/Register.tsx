import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  const sendCode = async () => {
    if (!phone) {
      toast.error('请输入手机号')
      return
    }

    try {
      await authApi.sendVerificationCode(phone)
      toast.success('验证码已发送')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || '发送失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || !password || !verificationCode) {
      toast.error('请填写完整信息')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await register(phone, password, verificationCode)
      toast.success('注册成功')
      navigate('/')
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col justify-center p-6">
      <div className="mb-8">
        <h1 className="text-title text-gray-text-primary mb-2">创建账号</h1>
        <p className="text-helper text-gray-secondary">注册新账号开始使用</p>
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
          <label className="block text-helper text-gray-secondary mb-2">验证码</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="请输入验证码"
              className="input-field flex-1"
              maxLength={6}
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={countdown > 0}
              className="btn-secondary whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-helper text-gray-secondary mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6-20位，包含字母和数字"
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-helper text-gray-secondary mb-2">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            className="input-field w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-center mt-6 text-helper text-gray-secondary">
        已有账号？
        <button
          onClick={() => navigate('/login')}
          className="text-primary ml-1"
        >
          立即登录
        </button>
      </p>
    </div>
  )
}
