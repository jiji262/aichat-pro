# FavoriteButton Component Tests

## Test Cases

### 1. Initial Render Tests
- **Test**: Component renders with correct initial state
- **Given**: A model with `is_favorite: false`
- **When**: Component is rendered
- **Then**: Button shows "+" symbol and gray styling

- **Test**: Component renders favorite state correctly
- **Given**: A model with `is_favorite: true`
- **When**: Component is rendered
- **Then**: Button shows "−" symbol and yellow styling

### 2. User Interaction Tests
- **Test**: Toggle from non-favorite to favorite
- **Given**: A model with `is_favorite: false`
- **When**: User clicks the button
- **Then**: Button immediately shows "−" symbol and yellow styling
- **And**: API call is made with correct parameters
- **And**: onToggle callback is called with correct values

- **Test**: Toggle from favorite to non-favorite
- **Given**: A model with `is_favorite: true`
- **When**: User clicks the button
- **Then**: Button immediately shows "+" symbol and gray styling
- **And**: API call is made with correct parameters
- **And**: onToggle callback is called with correct values

### 3. Loading State Tests
- **Test**: Loading state during API call
- **Given**: A model in any state
- **When**: User clicks button and API call is in progress
- **Then**: Button shows loading spinner
- **And**: Button is disabled
- **And**: Tooltip shows "Updating..."

### 4. Error Handling Tests
- **Test**: API call failure reverts state
- **Given**: A model with `is_favorite: false`
- **When**: User clicks button and API call fails
- **Then**: Button reverts to "+" symbol and gray styling
- **And**: Error alert is shown to user
- **And**: onToggle callback is not called

### 5. Accessibility Tests
- **Test**: Proper ARIA labels
- **Given**: Component in any state
- **When**: Rendered
- **Then**: Button has appropriate aria-label
- **And**: Button has descriptive title attribute

### 6. Tooltip Tests
- **Test**: Correct tooltips for each state
- **Given**: Component in non-favorite state
- **When**: User hovers over button
- **Then**: Tooltip shows "Add to favorites"

- **Given**: Component in favorite state
- **When**: User hovers over button
- **Then**: Tooltip shows "Remove from favorites"

## Manual Testing Checklist

### Visual Testing
- [ ] Button styling matches design for non-favorite state
- [ ] Button styling matches design for favorite state
- [ ] Hover effects work correctly
- [ ] Loading spinner appears during API calls
- [ ] Transitions are smooth

### Functional Testing
- [ ] Clicking toggles favorite status
- [ ] API calls are made with correct parameters
- [ ] Parent component receives correct callbacks
- [ ] Error states are handled gracefully
- [ ] Multiple rapid clicks don't cause issues

### Accessibility Testing
- [ ] Button is keyboard accessible
- [ ] Screen reader announces state changes
- [ ] Tooltips are readable by assistive technology
- [ ] Color contrast meets WCAG guidelines

## Integration Testing with ProvidersPage

### Model List Sorting
- **Test**: Favorite models appear first
- **Given**: Multiple models with mixed favorite status
- **When**: Models are displayed in providers page
- **Then**: Favorite models appear at the top
- **And**: Models are sorted alphabetically within each group

### State Synchronization
- **Test**: Favorite status persists across page navigation
- **Given**: User marks a model as favorite
- **When**: User navigates to chat page and back
- **Then**: Model remains marked as favorite

## Integration Testing with ChatPage

### Model Filtering
- **Test**: Only favorite models shown in dropdown
- **Given**: Provider has both favorite and non-favorite models
- **When**: User opens model dropdown in chat page
- **Then**: Only favorite models are displayed

- **Test**: Fallback to all models when no favorites
- **Given**: Provider has no favorite models
- **When**: User opens model dropdown in chat page
- **Then**: All models are displayed

### Model Selection Persistence
- **Test**: Selected model remains valid after favorite changes
- **Given**: User has selected a favorite model
- **When**: Model is unfavorited in providers page
- **Then**: Chat page updates model selection appropriately