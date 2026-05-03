import { useCallback, useState } from 'react'
import {
  analyzeRepo,
  compareRepos,
  getRepoOverview,
  reviewSecurity,
  reviewTechnical,
} from '../api/client'
import { isValidGitHubUrl } from '../utils/validateGitHubUrl'

export function useAnalyzeSession() {
  const [repoUrl, setRepoUrl] = useState('')
  const [overview, setOverview] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [compareUrl, setCompareUrl] = useState('')
  const [compareGoals, setCompareGoals] = useState('')
  const [compareResult, setCompareResult] = useState(null)
  const [loadingCompare, setLoadingCompare] = useState(false)
  const [compareError, setCompareError] = useState('')

  const [reviewType, setReviewType] = useState('security')
  const [reviewResults, setReviewResults] = useState({ security: null, technical: null })
  const [loadingReview, setLoadingReview] = useState({ security: false, technical: false })
  const [reviewErrors, setReviewErrors] = useState({ security: '', technical: '' })
  const [selectedFileByReview, setSelectedFileByReview] = useState({ security: null, technical: null })

  const [selectedFile, setSelectedFile] = useState(null)

  const handleLoad = useCallback(async (e) => {
    e.preventDefault()
    const url = repoUrl.trim()
    if (!url || loadingOverview) return
    if (!isValidGitHubUrl(url)) {
      setOverviewError('Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repo')
      return
    }

    setLoadingOverview(true)
    setOverviewError('')
    setOverview(null)
    setSummary(null)
    setReviewResults({ security: null, technical: null })
    setReviewErrors({ security: '', technical: '' })
    setLoadingReview({ security: false, technical: false })
    setSelectedFileByReview({ security: null, technical: null })
    setCompareResult(null)
    setSelectedFile(null)
    setActiveTab('overview')

    try {
      const data = await getRepoOverview(url)
      setOverview(data)
      setLoadingSummary(true)
      analyzeRepo(url)
        .then(s => setSummary(s))
        .catch(() => {})
        .finally(() => setLoadingSummary(false))
    } catch (err) {
      setOverviewError(err.message)
    } finally {
      setLoadingOverview(false)
    }
  }, [repoUrl, loadingOverview])

  const handleCompare = useCallback(async (e) => {
    e.preventDefault()
    const urlB = compareUrl.trim()
    if (!urlB || loadingCompare) return

    setLoadingCompare(true)
    setCompareError('')
    setCompareResult(null)

    try {
      const data = await compareRepos(repoUrl.trim(), urlB, compareGoals.trim())
      setCompareResult(data)
    } catch (err) {
      setCompareError(err.message)
    } finally {
      setLoadingCompare(false)
    }
  }, [compareUrl, compareGoals, repoUrl, loadingCompare])

  const handleReview = useCallback(async () => {
    if (loadingReview[reviewType]) return
    setLoadingReview(prev => ({ ...prev, [reviewType]: true }))
    setReviewErrors(prev => ({ ...prev, [reviewType]: '' }))
    setSelectedFileByReview(prev => ({ ...prev, [reviewType]: null }))

    try {
      const fn = reviewType === 'security' ? reviewSecurity : reviewTechnical
      const data = await fn(repoUrl.trim())
      setReviewResults(prev => ({ ...prev, [reviewType]: data }))
    } catch (err) {
      setReviewErrors(prev => ({ ...prev, [reviewType]: err.message }))
    } finally {
      setLoadingReview(prev => ({ ...prev, [reviewType]: false }))
    }
  }, [reviewType, repoUrl, loadingReview])

  function setSelectedReviewFile(path) {
    setSelectedFileByReview(prev => ({ ...prev, [reviewType]: path }))
  }

  const activeReviewResult = reviewResults[reviewType]
  const findings = activeReviewResult?.findings ?? []
  const activeReviewError = reviewErrors[reviewType]
  const activeReviewLoading = loadingReview[reviewType]
  const selectedReviewFile = selectedFileByReview[reviewType]

  return {
    repoUrl,
    setRepoUrl,
    overview,
    summary,
    loadingOverview,
    loadingSummary,
    overviewError,
    activeTab,
    setActiveTab,
    compareUrl,
    setCompareUrl,
    compareGoals,
    setCompareGoals,
    compareResult,
    loadingCompare,
    compareError,
    reviewType,
    setReviewType,
    reviewResults,
    loadingReview,
    selectedFile,
    setSelectedFile,
    handleLoad,
    handleCompare,
    handleReview,
    findings,
    activeReviewError,
    activeReviewLoading,
    selectedReviewFile,
    setSelectedReviewFile,
  }
}
