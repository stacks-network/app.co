import React from 'react'
import 'isomorphic-unfetch'
import { connect } from 'react-redux'
import Head from '@containers/head'
import Link from 'next/link'
import { bindActionCreators } from 'redux'
import { Page } from '@components/page'
import { Type, Field, Flex, Box, Button } from 'blockstack-ui'
import { selectAppConstants, selectApiServer } from '@stores/apps/selectors'
import { string, boolean } from 'yup'
import { Select } from '@components/mining/select'
import { AlertOutlineIcon } from 'mdi-react'
import debounce from 'lodash.debounce'
import UserStore from '@stores/user'

import { trackEvent } from '@utils'

const APP_SUBMISSION_DATA = 'app_submission_data'

const ErrorMessage = ({
  message = `Whoops! Please check the form for errors and try again.`,
  icon: Icon = AlertOutlineIcon,
  ...rest
}) => (
  <Flex
    boxShadow="card"
    alignItems="center"
    borderRadius={6}
    border={1}
    borderColor="red"
    py={4}
    px={4}
    mb={6}
    {...rest}
  >
    <Box color="red" pr={3}>
      <Icon />
    </Box>
    <Type lineHeight={1.75}>{message}</Type>
  </Flex>
)
const Bar = ({ ...rest }) => <Box width={80} mb={7} mt={5} height="1px" bg="blue.mid" {...rest} />

const outerHandleChange = (e) => (setState) => {
  if (e && e.persist) e.persist()
  setState((s) => ({
    ...s,
    values: {
      ...s.values,
      [e.target.name]: e.target.value
    }
  }))
}

const FormSection = ({ state, fields, handleChange, errors, message, setState }) => (
  <>
    {fields.map((field) => {
      if (field.type === 'radio') {
        if (!field.options || field.options.length !== 2) {
          console.log('Radio type fields need 2 options (true/false)')
          return null
        }
        return (
          <React.Fragment key={`radio-${field.name}`}>
            <Field.LabelAdvanced
              pb={3}
              label={field.label}
              required={field.required}
              error={errors && field && errors[field.name] && errors[field.name]}
            />
            <Box pb={4}>
              {field.options.map((option) => (
                  <Flex pb={3} alignItems="center" key={`radio-${field.name}-${option.value}`}>
                    <input
                      type="radio"
                      name={field.name}
                      value={option.value}
                      defaultChecked={String(option.value) === state[field.name] || undefined}
                      id={String(option.value)}
                      onChange={(e) => handleChange(e)(setState)}
                    />
                    <Field.Label pb={0} pl={2} is="label" htmlFor={String(option.value)}>
                      {option.label}
                    </Field.Label>
                  </Flex>
                ))}
            </Box>
          </React.Fragment>
        )
      }
      if (field.type === 'select') {
        const selectProps = { ...field }
        if (!!state[field.name]) {
          selectProps.defaultValue = { label: state[field.name], value: state[field.name] }
        }
        return (
          <React.Fragment key={`select-${field.name}`}>
            <Box pb={4}>
              <Field.LabelAdvanced
                pb={3}
                required={field.required}
                hint={field.hint}
                message={field.message}
                label={field.label}
                error={errors && field && errors[field.name] && errors[field.name]}
              />
              <Flex pb={3} alignItems="center">
                <Select
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: field.name,
                        value: e ? e.value : null
                      }
                    })(setState)
                  }
                  error={errors && field && errors[field.name] && errors[field.name]}
                  isClearable
                  {...selectProps}
                />
              </Flex>
            </Box>
          </React.Fragment>
        )
      }
      if (field.type === 'checkbox') {
        return (
          <React.Fragment key={`checkbox-${field.name}`}>
            <Box pb={4}>
              <Flex pb={3} alignItems="center">
                <input
                  type="checkbox"
                  name={field.name}
                  id={field.name}
                  defaultChecked={!!state[field.name] || undefined}
                  onChange={(e) =>
                    handleChange({
                      persist: e.persist,
                      target: {
                        name: e.target.name,
                        value: e.target.checked
                      }
                    })(setState)
                  }
                />
                <Field.LabelAdvanced
                  labelProps={{
                    pb: !!(errors && field && errors[field.name]) ? 2 : 0,
                    htmlFor: field.name
                  }}
                  pl={2}
                  required={field.required}
                  label={field.label}
                  error={errors && field && errors[field.name]}
                />
              </Flex>
              {field.message ? (
                <Field.Message maxWidth={400} lineHeight={1.5}>
                  {field.message}
                </Field.Message>
              ) : null}
            </Box>
          </React.Fragment>
        )
      }
      return (
        <Field
          noValidate="novalidate"
          onChange={(e) => handleChange(e)(setState)}
          key={`field-${field.name}`}
          defaultValue={state[field.name]}
          error={errors && field && errors[field.name] && errors[field.name]}
          {...field}
        />
      )
    })}
    {message ? <Box pb={4}>{message}</Box> : null}

    <Bar />
  </>
)

const Submit = ({ appConstants, setState, state, errors, submit, user, loading, signIn, isAppMiningEligible }) => {
  const personal = [
    {
      name: 'isSubmittingOwnApp',
      required: true,
      type: 'radio',
      label: 'Did you build this app?',
      options: [
        {
          label: 'Yes, I built this app.',
          value: true,
          checked: true
        },
        {
          label: 'No, I want to add an app someone else built.',
          value: false
        }
      ],
      validation: boolean().required('Required.')
    },
    {
      name: 'submitterName',
      required: true,
      label: 'Your Name',
      placeholder: 'Satoshi Nakamoto',
      validation: string().required('Your name is required.')
    },
    {
      name: 'contactEmail',
      required: true,
      label: 'Your Email',
      type: 'email',
      placeholder: 'satoshi@gmail.com',
      validation: string()
        .email('Please enter a valid email.')
        .required('Your email is required.')
    },
    {
      name: 'referralSource',
      required: false,
      label: 'How did you learn about App.co or App Mining?',
      placeholder: 'Hacker News'
    }
  ]

  console.log(user)
  if (user && user.jwt) {
    // If the user is logged in, remove the "Is this your app?" question
    personal.splice(0,1)
  }

  const appDetails = [
    {
      name: 'name',
      required: true,
      label: 'App Name',
      placeholder: 'Satoshi Chat',
      validation: string().required('Please enter the app name.')
    },
    {
      name: 'description',
      required: true,
      label: 'Short description',
      hint: 'Max 50 char.',
      message: 'Will appear on App.co category pages and search.',
      placeholder: 'A chat app for crypto.',
      maxLength: 50,
      validation: string().required('Please enter a short description.')
    },
    {
      name: 'website',
      required: true,
      label: 'Website',
      type: 'url',
      placeholder: 'https://satoshi.chat/',
      validation: string()
        .required('Please enter a website.')
        .url('Must be a valid URL with http/https.')
    },
    {
      name: 'imageUrl',
      required: true,
      label: 'App icon URL',
      type: 'url',
      message: 'Square icon, other sizes will be distorted. Accepted formats: JPG, PNG, SVG.',
      placeholder: 'https://example.com/app_icon.png',
      validation: string()
        .required('Please provide an icon.')
        .url('Must be a valid URL with http/https.')
    },
    {
      name: 'openSourceUrl',
      required: false,
      label: 'Open source URL',
      type: 'url',
      placeholder: 'https://github.com/SatoshiChat',
      validation: string().url('Must be a valid URL with http/https.')
    },
    {
      name: 'twitterHandle',
      required: false,
      label: "Application's Twitter handle",
      placeholder: '@SatoshiChat'
    }
  ]

  const generateOptions = (enums) =>
    Object.keys(enums)
      .sort((a, b) => {
        if (a.toLowerCase() !== b.toLowerCase()) {
          return a.toLowerCase() < b.toLowerCase() ? -1 : 1
        }
        return 0
      })
      .map((opt) => ({ label: opt, value: opt }))

  const categoryOptions = {
    category: generateOptions(appConstants.categoryEnums),
    blockchain: generateOptions(appConstants.blockchainEnums),
    storageNetwork: generateOptions(appConstants.storageEnums),
    authentication: generateOptions(appConstants.authenticationEnums)
  }

  const appCategories = [
    {
      name: 'category',
      required: true,
      label: 'Category',
      width: '100%',
      type: 'select',
      placeholder: 'Social networking',
      options: categoryOptions.category,
      validation: string().required('Please select a category.')
    },
    {
      name: 'blockchain',
      label: 'Blockchain',
      width: '100%',
      type: 'select',
      placeholder: 'Bitcoin',
      options: categoryOptions.blockchain
    },
    {
      name: 'storageNetwork',
      label: 'Storage',
      width: '100%',
      type: 'select',
      placeholder: 'IPFS',
      options: categoryOptions.storageNetwork
    },
    {
      name: 'authentication',
      label: 'Authentication',
      width: '100%',
      type: 'select',
      placeholder: 'Blockstack',
      options: categoryOptions.authentication,
      message: 'Blockstack authentication is required to qualify for App Mining.'
    }
  ]

  const agreements = [
    {
      name: 'public',
      required: true,
      type: 'checkbox',
      label: 'App is publicly accessible and user-ready',
      message:
        'App.co lists decentralized apps that are user-ready. Part of our review process is verifying anyone can immediately begin using the app.',
      validation: boolean().required('Required.')
    },
    {
      name: 'disclaimers',
      required: true,
      type: 'checkbox',
      label: (
        <>
          I agree to the{' '}
          <Type is="a" href="/terms" target="_blank">
            App.co Terms
          </Type>
          ,{' '}
          <Type is="a" href="/privacy" target="_blank">
            Privacy Policy
          </Type>
          , and{' '}
          <Type is="a" href="/mining/terms" target="_blank">
            App Mining Terms
          </Type>
          .
        </>
      ),
      validation: boolean().required('To submit an app, you must accept these terms.')
    }
  ]

  const sections = [
    {
      fields: personal
    },
    {
      fields: appDetails
    },
    {
      fields: appCategories,
      message: (
        <>
          Want to add a new category, blockchain, storage, or technology? <a href="mailto:hello@app.co">Contact us.</a>
        </>
      )
    },
    {
      fields: agreements
    }
  ]

  const validate = async () => {
    let errorsObj = {}
    let errorCount = 0
    await Promise.all(
      sections.map(async (section) =>
        Promise.all(
          section.fields.map(async (field) => {
            const isBool = field.type === 'radio' || field.type === 'checkbox'
            const value = state[field.name]
            if (isBool && field.required && !value) {
              errorsObj = {
                ...errorsObj,
                [field.name]: 'This is required.'
              }
              errorCount += 1
            } else if (field.validation) {
              try {
                await field.validation.validate(value)
              } catch (e) {
                errorsObj = {
                  ...errorsObj,
                  [field.name]: e.errors[0]
                }
                errorCount += 1
              }
            }
          })
        )
      )
    )
    return {
      count: errorCount,
      errors: errorsObj
    }
  }

  const handleValidation = async (e) => {
    if (e) e.preventDefault()
    const validation = await validate()
    if (validation.count > 0) {
      trackEvent('App Submission Page - Validation Errors')
      setState(() => ({
        errorCount: validation.count,
        errors: validation.errors
      }))
    } else {
      setState(() => ({
        errorCount: null,
        errors: {}
      }))
      submit()
    }
  }

  const blockstackAuth = (e) => {
    if (e) { e.preventDefault() }
    localStorage.setItem(APP_SUBMISSION_DATA, JSON.stringify(state))
    signIn('submit')
  }

  return (
    <Box mx="auto" maxWidth={700}>
      <Type is="h2">Add an app to App.co</Type>
      <Type is="p" lineHeight={1.5}>
        Add any user-ready decentralized app: It could be an app you built, or an app you discovered. We manually
        verify all information before publishing to App.co. Contact details are not displayed and we promise to keep
        your information private and safe.
      </Type>
      <Bar mb={0} />
      {user && user.user && (
        <Flex pt={6}>
          <Box mb={4} width={1}>
            <Field.LabelAdvanced
              labelProps={{
                pb: 3
              }}
              pl={0}
              required
              label="Blockstack ID"
            />
            <Box px={3} py={4} borderRadius={3} border="1px solid gray" display="inline-block">
              {user.user.blockstackUsername}
            </Box>
            <Type fontSize={1} display="block" mt={3}>
              You will use your ID to make changes to your app, and remove or modify it&apos;s listing in the future.
            </Type>
          </Box>
        </Flex>
      )}
      <Flex flexWrap="wrap" pt={6} flexDirection="column">
        <form noValidate onSubmit={handleValidation}>
          {sections.map((section) => (
            <FormSection
              errors={errors}
              handleChange={outerHandleChange}
              setState={setState}
              key={`section-${section.fields[0].name}`}
              message={section.message}
              fields={section.fields}
              state={state}
            />
          ))}
          {errors ? <ErrorMessage /> : null}
          {isAppMiningEligible && !(user && user.jwt) ? (
            <Button onClick={blockstackAuth}>{loading ? 'Loading...' : 'Login with Blockstack'}</Button>
          ) : (
            <Button>{loading ? 'Loading...' : 'Submit App'}</Button>
          )}
        </form>
      </Flex>
    </Box>
  )
}

const getValues = () => {
  if (typeof localStorage !== 'undefined') {
    const appDataJSON = localStorage.getItem(APP_SUBMISSION_DATA)
    if (appDataJSON) {
      const appData = JSON.parse(appDataJSON)
      console.log('from localStorage', appData)
      // localStorage.removeItem(APP_SUBMISSION_DATA)
      return appData
    }
  }
  return {}
}

class SubmitDapp extends React.Component {
  state = {
    values: getValues(),
    loading: false,
    success: false,
    errors: {},
    referralCode: null,
    refSource: null,
    accessToken: null
  }

  componentWillMount() {
    if (typeof window !== 'undefined') {
      trackEvent('App Submission Page - Page Load')
      this.setStateFromData()
    }
  }

  componentDidMount() {
    this.props.handleSignIn(this.props.apiServer)
  }

  setStateFromData() {
    const { search } = document.location
    if (search) {
      const refPart = search.match(/referralCode=(\w+)/)
      if (refPart) {
        const referralCode = refPart[1]
        const refSource = search.match(/refSource=(\w+)/)[1]
        this.setState({
          referralCode,
          refSource
        })
      }
    }
  }
  
  setStateFromLocalStorage = () => {
    const appDataJSON = localStorage.getItem(APP_SUBMISSION_DATA)
    if (appDataJSON) {
      const appData = JSON.parse(appDataJSON)
      console.log('from localStorage', appData)
      localStorage.removeItem(APP_SUBMISSION_DATA)
      return {
        values: appData
      }
    }
    return {}
  }

  submit = async () => {
    const { apiServer, user } = this.props
    const url = `${apiServer}/api/submit`
    this.setState({ loading: true })

    /**
     * Clean twitter handle of @ sign
     */
    let twitterHandle = this.state.values && this.state.values.twitterHandle
    if (twitterHandle && twitterHandle.includes('@')) {
      twitterHandle = twitterHandle.replace('@', '')
    }

    const { referralCode, refSource } = this.state
    const values = {
      ...this.state.values,
      twitterHandle,
      referralCode,
      refSource
    }

    try {
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      }
      if (user && user.jwt) {
        headers.Authorization = `Bearer ${user.jwt}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(values)
      })
      const { app } = await response.json()
      trackEvent('App Submission Page - Submission Success')
      this.setState({ success: true, loading: false, accessToken: app.accessToken })
    } catch (e) {
      trackEvent('App Submission Page - Submission Error')
      this.setState({ success: false, loading: false })
      console.error(e.message)
    }
  }

  makerPortalURL() {
    const { accessToken } = this.state
    return `/maker/${accessToken}`
  }

  appMiningEligible() {
    const { values } = this.state
    console.log(values)
    return values.authentication === 'Blockstack' && values.category !== "Sample Blockstack Apps"
  }

  render() {
    const { appConstants } = this.props
    const { accessToken } = this.state

    return (
      <Page>
        <Head title="Submit your dapp" description="Submit your dapp to be listed on the Universal Dapp Store." />
        <Page.Section wrap p={['32px', '64px']} mb={3} richText bg="white">
          {this.state.success ? (
            <>
              <Box width="100%" textAlign="center">
                <Box pb={6} width="100%">
                  <Type mx="auto" fontSize={5} fontWeight="bold">
                    Success!
                  </Type>
                </Box>
                <Box mx="auto">
                  <Type display="block">Thanks for your submission! We&apos;ll get back to you soon.</Type>
                  {this.appMiningEligible() && (
                    <>
                      <Type mt={2} display="block">You can update your app details using this magic link. Don&apos;t share this URL!</Type>
                      <Link
                        href={{
                          pathname: '/maker',
                          query: {
                            accessToken
                          }
                        }}
                        as={this.makerPortalURL()}
                        passHref
                      >
                        <Type mt={2} is="a" display="block">{document.location.origin}{this.makerPortalURL()}</Type> 
                      </Link>
                    </>
                  )}
                </Box>
                <Box pt={6}>
                  <Button is="a" href="/" color="white !important">
                    Back Home
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Submit
              loading={this.state.loading}
              submit={this.submit}
              success={this.state.success}
              appConstants={appConstants}
              setState={debounce((args) => this.setState(args), 100)}
              state={this.state.values}
              errors={this.state.errorCount > 0 && this.state.errors}
              signIn={this.props.signIn}
              user={this.props.user}
              isAppMiningEligible={this.appMiningEligible()}
            />
          )}
        </Page.Section>
      </Page>
    )
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(Object.assign({}, UserStore.actions), dispatch)
}

const mapStateToProps = (state) => ({
  appConstants: selectAppConstants(state),
  apiServer: selectApiServer(state),
  user: state.user
})

export default connect(mapStateToProps, mapDispatchToProps)(SubmitDapp)
