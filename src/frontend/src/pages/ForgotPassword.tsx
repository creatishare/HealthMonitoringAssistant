import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'verify' | 'reset'>('phone')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 发送验证码
  const sendCode = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号')
      return
    }

    setLoading(true)
    try {
      await authApi.sendVerificationCode(phone, 'reset-password')
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
      setStep('verify')
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || '发送失败')
    } finally {
      setLoading(false)
    }
  }

  // 验证手机号
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号')
      return
    }
    sendCode()
  }

  // 验证验证码
  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('请输入6位验证码')
      return
    }
    setStep('reset')
  }

  // 重置密码
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || newPassword.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(phone, verificationCode, newPassword)
      toast.success('密码重置成功，请使用新密码登录')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || '重置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col justify-center p-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-6 left-6 text-gray-secondary hover:text-gray-text-primary"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="mb-8">
        <h1 className="text-title text-gray-text-primary mb-2">
          {step === 'phone' && '找回密码'}
          {step === 'verify' && '验证手机号'}
          {step === 'reset' && '设置新密码'}
        </h1>
        <p className="text-helper text-gray-secondary">
          {step === 'phone' && '请输入注册时使用的手机号'}
          {step === 'verify' && `验证码已发送至 ${phone}`}
          {step === 'reset' && '请设置新的登录密码'}
        </p>
      </div>

      {/* 步骤1: 输入手机号 */}
      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label className="block text-helper text-gray-secondary mb-2">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入手机号"
              className="input-field w-full"
              maxLength={11}
            />
          </div>

          <button
            type="submit"
            disabled={loading || phone.length !== 11}
            className="btn-primary w-full mt-6"
          >
            {loading ? '发送中...' : '获取验证码'}
          </button>
        </form>
      )}

      {/* 步骤2: 输入验证码 */}
      {step === 'verify' && (
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div>
            <label className="block text-helper text-gray-secondary mb-2">验证码</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入6位验证码"
              className="input-field w-full"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={verificationCode.length !== 6}
            className="btn-primary w-full mt-6"
          >
            下一步
          </button>

          <div className="text-center mt-4">
            {countdown > 0 ? (
              <span className="text-helper text-gray-hint">{countdown}秒后可重新发送</span>
            ) : (
              <button
                type="button"
                onClick={sendCode}
                disabled={loading}
                className="text-helper text-primary"
              >
                重新发送验证码
              </button>
            )}
          </div>
        </form>
      )}

      {/* 步骤3: 设置新密码 */}
      {step === 'reset' && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label className="block text-helper text-gray-secondary mb-2">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-helper text-gray-secondary mb-2">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className="input-field w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="btn-primary w-full mt-6"
          >
            {loading ? '重置中...' : '重置密码'}
          </button>
        </form>
      )}

      <p className="text-center mt-6 text-helper text-gray-secondary">
        想起密码了？
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
