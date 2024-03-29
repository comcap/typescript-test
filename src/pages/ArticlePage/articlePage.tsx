import debounce from 'lodash/debounce'
import moment from 'moment-timezone'
import { useEffect, useMemo, useState } from 'react'
import ReactHtmlParser from 'react-html-parser'
import { useInfiniteQuery, useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'

import { ContentHeader, ContentSearchPage, Layout } from 'components/layout'
import { Loader } from 'components/output'
import { IResArticles, IResponse } from 'components/output/article/type'

import { getByID, getListInfinite } from 'core/action/collection'

import { Content } from './articlePage.style'

const formatDate = (userDate: Date) => {
  const dateTime = moment(userDate)
    .tz('Europe/London')
    .format('ddd DD MMM YYYY HH.MM zz')
    .toLocaleUpperCase()
  return dateTime
}

const ArticlePage: React.FC = () => {
  const location = useLocation()

  const [order, setOrder] = useState('newest')
  const [keyword, setKeyword] = useState('')

  const fetchSearchArticles = ({ pageParam = 1 }): Promise<IResponse> => {
    if (keyword) {
      return getListInfinite('/search', {
        q: keyword,
        page: pageParam,
        'page-size': 15,
        'show-fields': 'all',
        'order-by': order
      }).then((response: IResponse) => response)
    } else {
      return Promise.reject()
    }
  }

  const fetchArticle = (): Promise<IResArticles> => {
    return getByID(`/${location.state.id}`, {
      'show-fields': `thumbnail,headline,body,main`,
      'show-elements': `image,audio`
    }).then((response) => response)
  }

  useEffect(() => {
    setKeyword('')
  }, [location.state.id])

  const {
    data: search,
    isLoading: isLoadingSearch,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['searchNew', keyword, order],
    queryFn: ({ pageParam = 1 }) => fetchSearchArticles({ pageParam }),
    getNextPageParam: (lastPage) => lastPage.currentPage + 1,
    retry: 10,
    enabled: !!keyword
  })

  const { data: articles, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', location.state.id],
    queryFn: fetchArticle,
    retry: 10
  })

  const [observedEl, setObservedEl] = useState<any>(null)

  const observer = useMemo(
    () =>
      new IntersectionObserver(
        (items) => {
          if (items[0].isIntersecting) {
            fetchNextPage()
          }
        },
        { threshold: 1 }
      ),
    [fetchNextPage]
  )

  useEffect(() => {
    if (observedEl) {
      observer.observe(observedEl)
    }

    return () => {
      if (observedEl) {
        observer.unobserve(observedEl)
      }
    }
  }, [observedEl, observer])

  const onSearch = (val: string) => {
    setKeyword(val)
  }

  const onSelectFilter = (val: string) => {
    setOrder(val)
  }

  const renderContentSearch = () => {
    return (
      <>
        <ContentHeader onFilter={onSelectFilter} title="Search results" />
        {search?.pages.map((group) => (
          <ContentSearchPage
            onFilter={onSelectFilter}
            articles={group.results}
            loadRef={setObservedEl}
          />
        ))}
      </>
    )
  }

  return (
    <Layout onSearch={debounce(onSearch, 1500)}>
      <Content>
        {!isLoadingSearch && !isLoadingArticle ? (
          search && search?.pages[0].results.length > 0 ? (
            renderContentSearch()
          ) : (
            <>
              <div className="detail">
                <div className="content-detail">
                  {articles?.webPublicationDate && (
                    <span className="date">{formatDate(articles?.webPublicationDate)}</span>
                  )}
                  <h1>{articles?.webTitle}</h1>
                  <h3>{articles?.fields?.headline}</h3>
                  <div className="body">
                    <>
                      <hr />
                      <div className="thumbnail-inside-detail">
                        <>{articles?.fields?.main && ReactHtmlParser(articles?.fields?.main)}</>
                      </div>
                      <>{articles?.fields && ReactHtmlParser(articles?.fields?.body)}</>
                    </>
                  </div>
                </div>
                <div className="thumbnail-outside-detail">
                  <>{articles?.fields?.main && ReactHtmlParser(articles?.fields?.main)}</>
                </div>
              </div>
            </>
          )
        ) : (
          <Loader />
        )}
      </Content>
    </Layout>
  )
}

export default ArticlePage
